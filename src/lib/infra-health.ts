import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import type {
  InfraCheck,
  InfraCheckStatus,
  InfraHealth,
  InfraHostStatus,
} from "@/lib/infra-health-types";
import { isDatabaseConfigured, withDb } from "@/lib/db";
import { isS3Configured } from "@/lib/s3";
import { readFile } from "node:fs/promises";

const BACKUP_MAX_AGE_OK_HOURS = 26;
const BACKUP_MAX_AGE_WARN_HOURS = 50;
const DISK_WARN_PERCENT = 80;
const DISK_ERROR_PERCENT = 90;
const HOST_STATUS_MAX_AGE_MINUTES = 30;

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

async function readHostStatus(): Promise<InfraHostStatus | null> {
  const path = process.env.INFRA_STATUS_PATH ?? "/app/data/backups/infra-status.json";
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as InfraHostStatus;
  } catch {
    return null;
  }
}

async function checkDatabase(): Promise<InfraCheck> {
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
    await withDb(async (query) => {
      await query("SELECT 1");
    });
    return {
      id: "database",
      label: "PostgreSQL",
      status: "ok",
      detail: "Connexion active",
    };
  } catch {
    return {
      id: "database",
      label: "PostgreSQL",
      status: "error",
      detail: "Connexion impossible",
      hint: "Vérifiez le conteneur postgres et DATABASE_URL",
    };
  }
}

async function checkS3Backup(): Promise<InfraCheck> {
  if (!isS3Configured()) {
    return {
      id: "s3-backup",
      label: "Sauvegarde S3",
      status: "unknown",
      detail: "S3 non configuré",
      hint: "Ajoutez AWS_* dans .env.docker pour les backups distants",
    };
  }

  const prefix = `${process.env.AWS_S3_BACKUP_PREFIX ?? "backups/sdcreativ"}/`;
  const client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  try {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: process.env.AWS_S3_BUCKET!,
        Prefix: prefix,
      }),
    );

    const dumps =
      response.Contents?.map((item) => item.Key?.split("/").pop() ?? "")
        .filter((name) => name.endsWith(".dump"))
        .sort()
        .reverse() ?? [];

    if (dumps.length === 0) {
      return {
        id: "s3-backup",
        label: "Sauvegarde S3",
        status: "error",
        detail: "Aucun dump sur S3",
        hint: "Lancez ./scripts/db-backup.sh sur le VPS",
      };
    }

    const latest = dumps[0]!;
    const backupAt = parseBackupTimestamp(latest);
    if (!backupAt) {
      return {
        id: "s3-backup",
        label: "Sauvegarde S3",
        status: "warning",
        detail: `Dernier fichier : ${latest}`,
      };
    }

    const ageHours = (Date.now() - backupAt.getTime()) / 3_600_000;
    let status: InfraCheckStatus = "ok";
    if (ageHours > BACKUP_MAX_AGE_WARN_HOURS) status = "error";
    else if (ageHours > BACKUP_MAX_AGE_OK_HOURS) status = "warning";

    return {
      id: "s3-backup",
      label: "Sauvegarde S3",
      status,
      detail: `${latest} — il y a ${formatAgeHours(ageHours)}`,
      hint:
        status !== "ok"
          ? "Vérifiez le cron backup (3h) et /var/log/sdcreativ-backup.log"
          : undefined,
    };
  } catch {
    return {
      id: "s3-backup",
      label: "Sauvegarde S3",
      status: "error",
      detail: "Impossible de lister les sauvegardes S3",
      hint: "Vérifiez les permissions IAM sur le prefix backups/",
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
    detail:
      ageMinutes > HOST_STATUS_MAX_AGE_MINUTES
        ? `Dernière mise à jour il y a ${Math.round(ageMinutes)} min`
        : `Mis à jour il y a ${Math.max(1, Math.round(ageMinutes))} min`,
    hint:
      ageMinutes > HOST_STATUS_MAX_AGE_MINUTES
        ? "Installez le cron infra (scripts/install-backup-cron.sh)"
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
      detail: `${host.diskUsedPercent}% utilisé${
        typeof host.diskFreeGb === "number" ? ` — ${host.diskFreeGb} Go libres` : ""
      }`,
      hint: diskStatus !== "ok" ? "Libérez de l'espace ou augmentez le disque Hostinger" : undefined,
    });
  }

  if (typeof host.backupCronInstalled === "boolean") {
    checks.push({
      id: "backup-cron",
      label: "Cron sauvegarde",
      status: host.backupCronInstalled ? "ok" : "error",
      detail: host.backupCronInstalled ? "Planifié (3h quotidien)" : "Non installé",
      hint: host.backupCronInstalled ? undefined : "./scripts/install-backup-cron.sh",
    });
  }

  const docker = host.docker ?? {};
  const services = ["app", "postgres", "redis", "nginx"] as const;
  const down = services.filter((name) => docker[name] === "down");
  const unknown = services.filter((name) => !docker[name] || docker[name] === "unknown");

  if (down.length > 0) {
    checks.push({
      id: "docker",
      label: "Conteneurs Docker",
      status: "error",
      detail: `Arrêtés : ${down.join(", ")}`,
      hint: "docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod ps",
    });
  } else if (unknown.length === services.length) {
    checks.push({
      id: "docker",
      label: "Conteneurs Docker",
      status: "unknown",
      detail: "Statut non remonté",
    });
  } else {
    checks.push({
      id: "docker",
      label: "Conteneurs Docker",
      status: "ok",
      detail: "app, postgres, redis, nginx actifs",
    });
  }

  return checks;
}

export async function getInfraHealth(): Promise<InfraHealth> {
  const [database, s3Backup, host] = await Promise.all([
    checkDatabase(),
    checkS3Backup(),
    readHostStatus(),
  ]);

  const checks: InfraCheck[] = [database, s3Backup, ...checkHostSnapshot(host)];
  const environment =
    host?.environment ??
    (process.env.NODE_ENV === "production" ? "production" : "development");

  return {
    checkedAt: new Date().toISOString(),
    environment,
    overall: worstStatus(checks.map((check) => check.status)),
    checks,
  };
}
