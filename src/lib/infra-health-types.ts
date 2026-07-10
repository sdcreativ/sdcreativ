export type InfraCheckStatus = "ok" | "warning" | "error" | "unknown";

export type InfraMetric = {
  label: string;
  value: string;
};

export type InfraAction = {
  id: string;
  label: string;
  command: string;
  variant?: "primary" | "secondary" | "danger";
};

export type InfraCheck = {
  id: string;
  label: string;
  status: InfraCheckStatus;
  detail: string;
  hint?: string;
  metrics?: InfraMetric[];
  actions?: InfraAction[];
};

export type InfraDockerService = {
  name: string;
  label: string;
  status: "running" | "down" | "unknown";
};

export type InfraHealth = {
  checkedAt: string;
  environment: string;
  overall: InfraCheckStatus;
  hostname?: string;
  hostUpdatedAt?: string;
  dockerServices: InfraDockerService[];
  checks: InfraCheck[];
};

export type InfraHostStatus = {
  updatedAt: string;
  hostname?: string;
  diskUsedPercent?: number;
  diskFreeGb?: number;
  diskTotalGb?: number;
  backupCronInstalled?: boolean;
  infraCronInstalled?: boolean;
  lastBackupLogAt?: string | null;
  localBackupCount?: number;
  latestLocalBackup?: string | null;
  docker?: Record<string, "running" | "down" | "unknown">;
  environment?: string;
};

export const INFRA_RESTORE_LATEST_CMD = `BACKUP_DIR=/var/backups/sdcreativ COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml" ./scripts/backup-s3-restore.sh latest`;

export const INFRA_BACKUP_NOW_CMD = `BACKUP_DIR=/var/backups/sdcreativ COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml" ./scripts/db-backup.sh`;

export const INFRA_LIST_BACKUPS_CMD = "./scripts/backup-s3-list.sh";

export const INFRA_EXPORT_STATUS_CMD = "BACKUP_DIR=/var/backups/sdcreativ ./scripts/infra-status-export.sh";

export const INFRA_DOCKER_PS_CMD =
  'docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod ps';
