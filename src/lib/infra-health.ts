import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import type {
  InfraCheck,
  InfraCheckStatus,
  InfraDockerService,
  InfraHealth,
  InfraHostStatus,
} from "@/lib/infra-health-types";
import {
  INFRA_BACKUP_NOW_CMD,
  INFRA_DOCKER_PS_CMD,
  INFRA_EXPORT_STATUS_CMD,
  INFRA_LIST_BACKUPS_CMD,
  INFRA_RESTORE_LATEST_CMD,
} from "@/lib/infra-health-types";
import { isDatabaseConfigured, withDb } from "@/lib/db";
import { getStorageErrorMessage } from "@/lib/s3-errors";
import { isS3Configured } from "@/lib/s3";
import { readFile } from "node:fs/promises";

const BACKUP_MAX_AGE_OK_HOURS = 26;
const BACKUP_MAX_AGE_WARN_HOURS = 50;
const DISK_WARN_PERCENT = 80;
const DISK_ERROR_PERCENT = 90;
const HOST_STATUS_MAX_AGE_MINUTES = 30;

const DOCKER_LABELS: Record<string, string> = {
  app: "Application",
  postgres: "PostgreSQL",
  redis: "Redis",
  nginx: "Nginx",
  certbot: "Certbot",
};

function worstStatus(statuses: InfraCheckStatus[]): InfraCheckStatus {
  if (statuses.includes("error")) return "error";
  if (statuses.includes("warning")) return "warning";
  if (statuses.every((s) => s === "unknown")) return "unknown";
  return "ok";
}

function parseBackupTimestamp(filename: string): Date | null {
  const match = filename.match(/sdcreativ-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.dump$/);
  if (!match) return null;
  const [, y, mo, d, h, mi, s] = match;
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`);
}

function formatAgeHours(hours: number): string {
  if (hours < 1) return "moins d'une heure";
  if (hours < 24) return `${Math.round(hours)} h`;
  const days = Math.floor(hours / 24);
  const rem = Math.round(hours % 24);
  return rem > 0 ? `${days} j ${rem} h` : `${days} j`;
}

function formatDateFr(date: Date): string {
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeS3BackupPrefix(raw: string | undefined): string {
  const base = (raw?.trim() || "backups/sdcreativ").replace(/^\/+/, "").replace(/\/+$/, "");
  return `${base}/`;
}

function s3ErrorCode(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const err = error as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
  return err.Code ?? err.name ?? "";
}

async function readHostStatus(): Promise<InfraHostStatus | null> {
  const statusPath =
    process.env.INFRA_STATUS_PATH ?? "/app/data/backups/infra-status.json";
  try {
    // Fichier runtime VPS hors du bundle — ne pas tracer via NFT Turbopack.
    const raw = await readFile(/* turbopackIgnore: true */ statusPath, "utf8");
    return JSON.parse(raw) as InfraHostStatus;
  } catch {
    return null;
  }
}

function buildDockerServices(host: InfraHostStatus | null): InfraDockerService[] {
  const docker = host?.docker ?? {};
  return (["app", "postgres", "redis", "nginx", "certbot"] as const).map((name) => ({
    name,
    label: DOCKER_LABELS[name] ?? name,
    status: docker[name] ?? "unknown",
  }));
}

function dockerCheck(services: InfraDockerService[]): InfraCheck {
  const core = services.filter((s) => s.name !== "certbot");
  const down = core.filter((s) => s.status === "down");
  const unknown = core.filter((s) => s.status === "unknown");
  const running = core.filter((s) => s.status === "running");

  let status: InfraCheckStatus = "ok";
  let detail = `${running.length}/${core.length} services actifs`;

  if (down.length > 0) {
    status = "error";
    detail = `Arrêtés : ${down.map((s) => s.name).join(", ")}`;
  } else if (unknown.length === core.length) {
    status = "unknown";
    detail = "Statut non remonté depuis le VPS";
  } else if (unknown.length > 0) {
    status = "warning";
    detail = `${unknown.length} service(s) sans statut`;
  }

  return {
    id: "docker",
    label: "Conteneurs Docker",
    status,
    detail,
    metrics: services.map((s) => ({
      label: s.label,
      value:
        s.status === "running" ? "Actif" : s.status === "down" ? "Arrêté" : "Inconnu",
    })),
    hint:
      status !== "ok"
        ? "Sur le VPS : ./scripts/infra-status-export.sh puis vérifier Docker"
        : undefined,
    actions: [
      {
        id: "docker-ps",
        label: "Commande docker ps",
        command: INFRA_DOCKER_PS_CMD,
        variant: "secondary",
      },
      {
        id: "export-status",
        label: "Rafraîchir statut VPS",
        command: INFRA_EXPORT_STATUS_CMD,
        variant: "secondary",
      },
    ],
  };
}

async function checkDatabase(host: InfraHostStatus | null): Promise<InfraCheck> {
  if (!isDatabaseConfigured()) {
    return {
      id: "database",
      label: "PostgreSQL",
      status: "error",
      detail: "Base non configurée",
      hint: "Vérifiez DATABASE_URL dans .env.docker",
    };
  }

  try {
    let dbSize = "—";
    await withDb(async (query) => {
      await query("SELECT 1");
      const size = await query<{ size: string }>(
        "SELECT pg_size_pretty(pg_database_size(current_database())) AS size",
      );
      dbSize = size.rows[0]?.size ?? "—";
    });

    const pgDocker = host?.docker?.postgres;
    return {
      id: "database",
      label: "PostgreSQL",
      status: pgDocker === "down" ? "error" : "ok",
      detail: pgDocker === "down" ? "Conteneur postgres arrêté" : "Connexion active",
      metrics: [
        { label: "Taille base", value: dbSize },
        { label: "Conteneur", value: pgDocker === "running" ? "Actif" : pgDocker ?? "—" },
      ],
    };
  } catch {
    return {
      id: "database",
      label: "PostgreSQL",
      status: "error",
      detail: "Connexion impossible",
      hint: "Vérifiez le conteneur postgres et DATABASE_URL",
      actions: [
        {
          id: "docker-ps",
          label: "Diagnostiquer Docker",
          command: INFRA_DOCKER_PS_CMD,
          variant: "secondary",
        },
      ],
    };
  }
}

async function checkS3Backup(host: InfraHostStatus | null): Promise<InfraCheck> {
  const restoreActions = [
    {
      id: "restore-latest",
      label: "Restaurer dernière sauvegarde",
      command: INFRA_RESTORE_LATEST_CMD,
      variant: "danger" as const,
    },
    {
      id: "backup-now",
      label: "Lancer une sauvegarde",
      command: INFRA_BACKUP_NOW_CMD,
      variant: "primary" as const,
    },
    {
      id: "list-backups",
      label: "Lister les backups S3",
      command: INFRA_LIST_BACKUPS_CMD,
      variant: "secondary" as const,
    },
  ];

  if (!isS3Configured()) {
    return {
      id: "s3-backup",
      label: "Sauvegarde S3",
      status: "unknown",
      detail: "S3 non configuré",
      hint: "Ajoutez AWS_* dans .env.docker pour les backups distants",
      actions: restoreActions.filter((a) => a.id !== "restore-latest"),
    };
  }

  const bucket = process.env.AWS_S3_BUCKET!;
  const region = process.env.AWS_REGION!;
  const prefix = normalizeS3BackupPrefix(process.env.AWS_S3_BACKUP_PREFIX);
  const client = new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  const localName = host?.latestLocalBackup?.trim() || null;
  const localAt = localName ? parseBackupTimestamp(localName) : null;
  const localAgeHours = localAt ? (Date.now() - localAt.getTime()) / 3_600_000 : null;
  const localRecent =
    localAgeHours != null && localAgeHours <= BACKUP_MAX_AGE_WARN_HOURS;

  try {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        MaxKeys: 100,
      }),
    );

    const dumps =
      response.Contents?.map((item) => ({
        name: item.Key?.split("/").pop() ?? "",
        lastModified: item.LastModified,
        size: item.Size,
      }))
        .filter((item) => item.name.endsWith(".dump"))
        .sort((a, b) => (b.lastModified?.getTime() ?? 0) - (a.lastModified?.getTime() ?? 0)) ??
      [];

    if (dumps.length === 0) {
      // Dumps locaux récents : alerte, pas critique (souvent upload S3 non encore parti / IAM Put).
      if (localRecent && localName) {
        return {
          id: "s3-backup",
          label: "Sauvegarde S3",
          status: "warning",
          detail: "Aucun dump sur S3 (copie locale OK)",
          metrics: [
            { label: "Dernière sauvegarde", value: `locale · ${localName}` },
            {
              label: "Date locale",
              value: localAt ? formatDateFr(localAt) : "—",
            },
            {
              label: "Copies locales",
              value: host?.localBackupCount != null ? String(host.localBackupCount) : "—",
            },
            { label: "Prefix S3", value: `s3://${bucket}/${prefix}` },
          ],
          hint: "Les dumps locaux existent : vérifiez l’upload S3 (db-backup.sh) et les droits s3:PutObject sur backups/*.",
          actions: restoreActions,
        };
      }
      return {
        id: "s3-backup",
        label: "Sauvegarde S3",
        status: "error",
        detail: "Aucun dump sur S3",
        hint: `Lancez ./scripts/db-backup.sh sur le VPS (prefix s3://${bucket}/${prefix})`,
        actions: restoreActions,
      };
    }

    const latest = dumps[0]!;
    const backupAt =
      parseBackupTimestamp(latest.name) ?? latest.lastModified ?? null;
    const ageHours = backupAt ? (Date.now() - backupAt.getTime()) / 3_600_000 : null;

    let status: InfraCheckStatus = "ok";
    if (ageHours != null) {
      if (ageHours > BACKUP_MAX_AGE_WARN_HOURS) status = "error";
      else if (ageHours > BACKUP_MAX_AGE_OK_HOURS) status = "warning";
    }

    const sizeMb =
      latest.size != null ? `${(latest.size / 1024 / 1024).toFixed(1)} Mo` : "—";

    return {
      id: "s3-backup",
      label: "Sauvegarde S3",
      status,
      detail: latest.name,
      metrics: [
        {
          label: "Dernière sauvegarde",
          value: ageHours != null ? `il y a ${formatAgeHours(ageHours)}` : "—",
        },
        {
          label: "Date",
          value: backupAt ? formatDateFr(backupAt) : "—",
        },
        { label: "Taille dump", value: sizeMb },
        { label: "Dumps S3", value: String(dumps.length) },
        {
          label: "Copies locales",
          value: host?.localBackupCount != null ? String(host.localBackupCount) : "—",
        },
      ],
      hint:
        status !== "ok"
          ? "Vérifiez le cron backup (3h) et /var/log/sdcreativ-backup.log"
          : "La restauration s'exécute en SSH sur le VPS (commande ci-dessous).",
      actions: restoreActions,
    };
  } catch (error) {
    console.error("[infra-health] s3-backup list", {
      bucket,
      region,
      prefix,
      error,
    });

    const code = s3ErrorCode(error);
    const isAccess =
      code === "AccessDenied" ||
      code === "AllAccessDisabled" ||
      code === "AccessDeniedException";
    const isRegion =
      code === "PermanentRedirect" ||
      code === "AuthorizationHeaderMalformed" ||
      code === "IllegalLocationConstraintException";

    let hint = getStorageErrorMessage(error);
    if (isAccess) {
      hint =
        `IAM : autorisez s3:ListBucket (prefix ${prefix}*) et s3:GetObject/PutObject sur s3://${bucket}/${prefix}* — la policy « clients/* » seule bloque les backups.`;
    } else if (isRegion) {
      hint = `Région incorrecte : AWS_REGION=${region} doit correspondre au bucket ${bucket}.`;
    }

    // Ne pas passer tout le widget en Critique si les dumps locaux sont frais.
    if (localRecent && localName) {
      return {
        id: "s3-backup",
        label: "Sauvegarde S3",
        status: "warning",
        detail: "S3 inaccessible (copie locale OK)",
        metrics: [
          { label: "Dernière sauvegarde", value: `locale · ${localName}` },
          {
            label: "Date locale",
            value: localAt ? formatDateFr(localAt) : "—",
          },
          {
            label: "Copies locales",
            value: host?.localBackupCount != null ? String(host.localBackupCount) : "—",
          },
          { label: "Bucket", value: `${bucket} (${region})` },
        ],
        hint,
        actions: restoreActions,
      };
    }

    return {
      id: "s3-backup",
      label: "Sauvegarde S3",
      status: "error",
      detail: "Impossible de lister les sauvegardes S3",
      hint,
      actions: restoreActions,
    };
  }
}

function checkHostSnapshot(host: InfraHostStatus | null): InfraCheck[] {
  if (!host?.updatedAt) {
    return [
      {
        id: "host-status",
        label: "État VPS",
        status: "unknown",
        detail: "Données hôte non disponibles",
        hint: "Sur le VPS : ./scripts/infra-status-export.sh et montage /var/backups/sdcreativ",
        actions: [
          {
            id: "export-status",
            label: "Commande export statut",
            command: INFRA_EXPORT_STATUS_CMD,
            variant: "secondary",
          },
        ],
      },
    ];
  }

  const updatedAt = new Date(host.updatedAt);
  const ageMinutes = (Date.now() - updatedAt.getTime()) / 60_000;
  const checks: InfraCheck[] = [];

  checks.push({
    id: "host-status",
    label: "État VPS",
    status: ageMinutes > HOST_STATUS_MAX_AGE_MINUTES ? "warning" : "ok",
    detail: host.hostname ?? "Serveur production",
    metrics: [
      {
        label: "Dernière sync",
        value: `il y a ${Math.max(1, Math.round(ageMinutes))} min`,
      },
      {
        label: "Cron infra",
        value: host.infraCronInstalled ? "Actif (/15 min)" : "Absent",
      },
      {
        label: "Log backup",
        value: host.lastBackupLogAt
          ? formatDateFr(new Date(host.lastBackupLogAt))
          : "—",
      },
    ],
    hint:
      ageMinutes > HOST_STATUS_MAX_AGE_MINUTES
        ? "Installez le cron infra : ./scripts/install-backup-cron.sh"
        : undefined,
  });

  if (typeof host.diskUsedPercent === "number") {
    let diskStatus: InfraCheckStatus = "ok";
    if (host.diskUsedPercent >= DISK_ERROR_PERCENT) diskStatus = "error";
    else if (host.diskUsedPercent >= DISK_WARN_PERCENT) diskStatus = "warning";

    checks.push({
      id: "disk",
      label: "Disque VPS",
      status: diskStatus,
      detail: `${host.diskUsedPercent}% utilisé`,
      metrics: [
        { label: "Utilisation", value: `${host.diskUsedPercent}%` },
        {
          label: "Libre",
          value: typeof host.diskFreeGb === "number" ? `${host.diskFreeGb} Go` : "—",
        },
        {
          label: "Total",
          value: typeof host.diskTotalGb === "number" ? `${host.diskTotalGb} Go` : "—",
        },
      ],
      hint: diskStatus !== "ok" ? "Libérez de l'espace ou augmentez le disque Hostinger" : undefined,
    });
  }

  if (typeof host.backupCronInstalled === "boolean") {
    checks.push({
      id: "backup-cron",
      label: "Cron sauvegarde",
      status: host.backupCronInstalled ? "ok" : "error",
      detail: host.backupCronInstalled ? "Planifié chaque nuit" : "Non installé",
      metrics: [
        { label: "Fréquence", value: "3h00 (quotidien)" },
        {
          label: "Dernier dump local",
          value: host.latestLocalBackup ?? "—",
        },
      ],
      hint: host.backupCronInstalled ? undefined : "./scripts/install-backup-cron.sh",
      actions: host.backupCronInstalled
        ? [
            {
              id: "backup-now",
              label: "Sauvegarde manuelle",
              command: INFRA_BACKUP_NOW_CMD,
              variant: "primary",
            },
          ]
        : [
            {
              id: "install-cron",
              label: "Installer les crons",
              command: "sudo BACKUP_DIR=/var/backups/sdcreativ CRON_USER=deploy ./scripts/install-backup-cron.sh",
              variant: "primary",
            },
          ],
    });
  }

  return checks;
}

export async function getInfraHealth(): Promise<InfraHealth> {
  const host = await readHostStatus();
  const dockerServices = buildDockerServices(host);
  const [database, s3Backup] = await Promise.all([
    checkDatabase(host),
    checkS3Backup(host),
  ]);

  const checks: InfraCheck[] = [
    database,
    s3Backup,
    ...checkHostSnapshot(host),
    dockerCheck(dockerServices),
  ];

  const environment =
    host?.environment ??
    (process.env.NODE_ENV === "production" ? "production" : "development");

  return {
    checkedAt: new Date().toISOString(),
    environment,
    overall: worstStatus(checks.map((check) => check.status)),
    hostname: host?.hostname,
    hostUpdatedAt: host?.updatedAt,
    dockerServices,
    checks,
  };
}
