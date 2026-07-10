export type InfraCheckStatus = "ok" | "warning" | "error" | "unknown";

export type InfraCheck = {
  id: string;
  label: string;
  status: InfraCheckStatus;
  detail: string;
  hint?: string;
};

export type InfraHealth = {
  checkedAt: string;
  environment: string;
  overall: InfraCheckStatus;
  checks: InfraCheck[];
};

export type InfraHostStatus = {
  updatedAt: string;
  hostname?: string;
  diskUsedPercent?: number;
  diskFreeGb?: number;
  backupCronInstalled?: boolean;
  lastBackupLogAt?: string | null;
  docker?: Record<string, "running" | "down" | "unknown">;
  environment?: string;
};
