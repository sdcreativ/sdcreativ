import { z } from "zod";
import type { QueryResultRow } from "pg";
import {
  buildDefaultBenefits,
  buildDefaultClauses,
  buildDefaultMissions,
  type EmployeeContractClause,
} from "@/content/employee-contract-clauses";
import {
  EMPLOYEE_COMPENSATION_PERIODS,
  EMPLOYEE_CONTRACT_STATUSES,
  EMPLOYEE_CONTRACT_TYPES,
  type EmployeeCompensationPeriod,
  type EmployeeContractStatus,
  type EmployeeContractType,
} from "@/content/employee-contracts-labels";
import { SUPPORTED_CURRENCIES } from "@/lib/currencies";
import { withDb } from "@/lib/db";

export type { EmployeeContractClause };

export type EmployeeContract = {
  id: string;
  reference: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  contractType: EmployeeContractType;
  title: string;
  status: EmployeeContractStatus;
  startDate: string | null;
  endDate: string | null;
  trialEndDate: string | null;
  jobTitle: string | null;
  department: string | null;
  workLocation: string | null;
  weeklyHours: number | null;
  compensationAmount: number | null;
  compensationCurrency: string;
  compensationPeriod: EmployeeCompensationPeriod;
  reminderDaysBefore: number;
  signedAt: string | null;
  sentAt: string | null;
  endedAt: string | null;
  documentS3Key: string | null;
  documentName: string | null;
  notes: string | null;
  internalReference: string | null;
  missions: string | null;
  benefits: string[];
  clauses: EmployeeContractClause[];
  metadata: Record<string, unknown>;
  signatureProvider: string | null;
  esignExternalId: string | null;
  esignDocumentId: string | null;
  esignSignerEmail: string | null;
  esignSentAt: string | null;
  esignCompletedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  /** Jours restants avant fin (null si pas de fin / déjà passé / non actif). */
  daysUntilEnd: number | null;
};

type EmployeeContractRow = {
  id: string;
  reference: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  contract_type: EmployeeContractType;
  title: string;
  status: EmployeeContractStatus;
  start_date: Date | null;
  end_date: Date | null;
  trial_end_date: Date | null;
  job_title: string | null;
  department: string | null;
  work_location: string | null;
  weekly_hours: string | number | null;
  compensation_amount: number | null;
  compensation_currency: string;
  compensation_period: EmployeeCompensationPeriod;
  reminder_days_before: number;
  signed_at: Date | null;
  sent_at: Date | null;
  ended_at: Date | null;
  document_s3_key: string | null;
  document_name: string | null;
  notes: string | null;
  internal_reference: string | null;
  missions: string | null;
  benefits: unknown;
  clauses: unknown;
  metadata: Record<string, unknown> | null;
  signature_provider: string | null;
  esign_external_id: string | null;
  esign_document_id: string | null;
  esign_signer_email: string | null;
  esign_sent_at: Date | null;
  esign_completed_at: Date | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
};

const selectSql = `
  SELECT ec.*,
         u.name AS user_name,
         COALESCE(u.personal_email, u.email) AS user_email
  FROM employee_contracts ec
  LEFT JOIN crm_users u ON u.id = ec.user_id
`;

function toDateOnly(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function computeDaysUntilEnd(
  endDate: Date | null,
  status: EmployeeContractStatus,
): number | null {
  if (!endDate) return null;
  if (!["active", "signed", "pending_signature"].includes(status)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / 86_400_000);
}

function parseBenefits(raw: unknown, type: EmployeeContractType): string[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((b) => String(b).trim()).filter(Boolean);
  }
  return buildDefaultBenefits(type);
}

function parseClauses(raw: unknown, type: EmployeeContractType): EmployeeContractClause[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        const title = String(row.title ?? "").trim();
        const body = String(row.body ?? "").trim();
        const key = String(row.key ?? title).trim() || `clause-${title.slice(0, 12)}`;
        if (!title || !body) return null;
        return { key, title, body };
      })
      .filter((c): c is EmployeeContractClause => Boolean(c));
  }
  return buildDefaultClauses(type);
}

function mapContract(row: EmployeeContractRow): EmployeeContract {
  const weekly =
    row.weekly_hours == null || row.weekly_hours === ""
      ? null
      : Number(row.weekly_hours);
  const type = row.contract_type;

  return {
    id: row.id,
    reference: row.reference,
    userId: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
    contractType: type,
    title: row.title,
    status: row.status,
    startDate: toDateOnly(row.start_date),
    endDate: toDateOnly(row.end_date),
    trialEndDate: toDateOnly(row.trial_end_date),
    jobTitle: row.job_title,
    department: row.department,
    workLocation: row.work_location,
    weeklyHours: Number.isFinite(weekly) ? weekly : null,
    compensationAmount: row.compensation_amount,
    compensationCurrency: row.compensation_currency,
    compensationPeriod: row.compensation_period,
    reminderDaysBefore: row.reminder_days_before,
    signedAt: row.signed_at?.toISOString() ?? null,
    sentAt: row.sent_at?.toISOString() ?? null,
    endedAt: row.ended_at?.toISOString() ?? null,
    documentS3Key: row.document_s3_key,
    documentName: row.document_name,
    notes: row.notes,
    internalReference: row.internal_reference ?? null,
    missions: row.missions?.trim() || buildDefaultMissions(type),
    benefits: parseBenefits(row.benefits, type),
    clauses: parseClauses(row.clauses, type),
    metadata: row.metadata ?? {},
    signatureProvider: row.signature_provider ?? null,
    esignExternalId: row.esign_external_id ?? null,
    esignDocumentId: row.esign_document_id ?? null,
    esignSignerEmail: row.esign_signer_email ?? null,
    esignSentAt: row.esign_sent_at?.toISOString() ?? null,
    esignCompletedAt: row.esign_completed_at?.toISOString() ?? null,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    daysUntilEnd: computeDaysUntilEnd(row.end_date, row.status),
  };
}

async function nextReference(
  query: (text: string, params?: unknown[]) => Promise<{ rows: QueryResultRow[]; rowCount: number | null }>,
): Promise<string> {
  const year = new Date().getFullYear();
  const { rows } = await query(
    `SELECT COUNT(*)::text AS count FROM employee_contracts WHERE EXTRACT(YEAR FROM created_at) = $1`,
    [year],
  );
  const seq = String(Number((rows[0] as { count: string })?.count ?? 0) + 1).padStart(4, "0");
  return `EMP-${year}-${seq}`;
}

const dateField = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (AAAA-MM-JJ)")
  .optional()
  .nullable();

const clauseSchema = z.object({
  key: z.string().trim().min(1).max(80),
  title: z.string().trim().min(2).max(200),
  body: z.string().trim().min(10).max(12000),
});

export const createEmployeeContractSchema = z.object({
  userId: z.string().uuid(),
  contractType: z.enum(EMPLOYEE_CONTRACT_TYPES),
  title: z.string().trim().min(2).max(200),
  startDate: dateField,
  endDate: dateField,
  trialEndDate: dateField,
  jobTitle: z.string().trim().max(160).optional().nullable(),
  department: z.string().trim().max(120).optional().nullable(),
  workLocation: z.string().trim().max(160).optional().nullable(),
  weeklyHours: z.number().min(0).max(80).optional().nullable(),
  compensationAmount: z.number().int().min(0).optional().nullable(),
  compensationCurrency: z.enum(SUPPORTED_CURRENCIES).optional(),
  compensationPeriod: z.enum(EMPLOYEE_COMPENSATION_PERIODS).optional(),
  reminderDaysBefore: z.number().int().min(1).max(365).optional(),
  notes: z.string().trim().max(8000).optional().nullable(),
  internalReference: z.string().trim().max(80).optional().nullable(),
  missions: z.string().trim().max(12000).optional().nullable(),
  benefits: z.array(z.string().trim().min(1).max(400)).max(40).optional(),
  clauses: z.array(clauseSchema).max(40).optional(),
  resetClausesFromTemplate: z.boolean().optional(),
});

export const updateEmployeeContractSchema = z.object({
  contractType: z.enum(EMPLOYEE_CONTRACT_TYPES).optional(),
  title: z.string().trim().min(2).max(200).optional(),
  status: z.enum(EMPLOYEE_CONTRACT_STATUSES).optional(),
  startDate: dateField,
  endDate: dateField,
  trialEndDate: dateField,
  jobTitle: z.string().trim().max(160).optional().nullable(),
  department: z.string().trim().max(120).optional().nullable(),
  workLocation: z.string().trim().max(160).optional().nullable(),
  weeklyHours: z.number().min(0).max(80).optional().nullable(),
  compensationAmount: z.number().int().min(0).optional().nullable(),
  compensationCurrency: z.enum(SUPPORTED_CURRENCIES).optional(),
  compensationPeriod: z.enum(EMPLOYEE_COMPENSATION_PERIODS).optional(),
  reminderDaysBefore: z.number().int().min(1).max(365).optional(),
  notes: z.string().trim().max(8000).optional().nullable(),
  internalReference: z.string().trim().max(80).optional().nullable(),
  missions: z.string().trim().max(12000).optional().nullable(),
  benefits: z.array(z.string().trim().min(1).max(400)).max(40).optional(),
  clauses: z.array(clauseSchema).max(40).optional(),
  resetClausesFromTemplate: z.boolean().optional(),
  documentS3Key: z.string().trim().max(500).optional().nullable(),
  documentName: z.string().trim().max(255).optional().nullable(),
});

export async function listEmployeeContracts(filters?: {
  userId?: string;
  status?: EmployeeContractStatus;
  contractType?: EmployeeContractType;
}): Promise<EmployeeContract[]> {
  return withDb(async (query) => {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (filters?.userId) {
      params.push(filters.userId);
      clauses.push(`ec.user_id = $${params.length}`);
    }
    if (filters?.status) {
      params.push(filters.status);
      clauses.push(`ec.status = $${params.length}`);
    }
    if (filters?.contractType) {
      params.push(filters.contractType);
      clauses.push(`ec.contract_type = $${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const { rows } = await query<EmployeeContractRow>(
      `${selectSql} ${where} ORDER BY ec.updated_at DESC`,
      params,
    );
    return rows.map(mapContract);
  });
}

export async function getEmployeeContractById(id: string): Promise<EmployeeContract | null> {
  return withDb(async (query) => {
    const { rows } = await query<EmployeeContractRow>(
      `${selectSql} WHERE ec.id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ? mapContract(rows[0]) : null;
  });
}

export async function createEmployeeContract(
  input: z.infer<typeof createEmployeeContractSchema>,
  createdBy?: string | null,
): Promise<EmployeeContract> {
  return withDb(async (query) => {
    const reference = await nextReference(query);
    const clauses =
      input.clauses && input.clauses.length > 0
        ? input.clauses
        : buildDefaultClauses(input.contractType);
    const benefits =
      input.benefits && input.benefits.length > 0
        ? input.benefits
        : buildDefaultBenefits(input.contractType);
    const missions =
      input.missions?.trim() || buildDefaultMissions(input.contractType);

    const { rows } = await query<EmployeeContractRow>(
      `WITH inserted AS (
         INSERT INTO employee_contracts (
           reference, user_id, contract_type, title,
           start_date, end_date, trial_end_date,
           job_title, department, work_location, weekly_hours,
           compensation_amount, compensation_currency, compensation_period,
           reminder_days_before, notes, internal_reference, missions,
           benefits, clauses, created_by
         ) VALUES (
           $1, $2, $3, $4,
           $5::date, $6::date, $7::date,
           $8, $9, $10, $11,
           $12, $13, $14,
           $15, $16, $17, $18,
           $19::jsonb, $20::jsonb, $21
         )
         RETURNING *
       )
       SELECT i.*,
              u.name AS user_name,
              COALESCE(u.personal_email, u.email) AS user_email
       FROM inserted i
       LEFT JOIN crm_users u ON u.id = i.user_id`,
      [
        reference,
        input.userId,
        input.contractType,
        input.title,
        input.startDate ?? null,
        input.endDate ?? null,
        input.trialEndDate ?? null,
        input.jobTitle?.trim() || null,
        input.department?.trim() || null,
        input.workLocation?.trim() || null,
        input.weeklyHours ?? null,
        input.compensationAmount ?? null,
        input.compensationCurrency ?? "XOF",
        input.compensationPeriod ?? "monthly",
        input.reminderDaysBefore ?? 30,
        input.notes?.trim() || null,
        input.internalReference?.trim() || null,
        missions,
        JSON.stringify(benefits),
        JSON.stringify(clauses),
        createdBy ?? null,
      ],
    );
    return mapContract(rows[0]!);
  });
}

export async function updateEmployeeContract(
  id: string,
  input: z.infer<typeof updateEmployeeContractSchema>,
): Promise<EmployeeContract | null> {
  return withDb(async (query) => {
    const { rows: existingRows } = await query<EmployeeContractRow>(
      `${selectSql} WHERE ec.id = $1 LIMIT 1`,
      [id],
    );
    const existingRow = existingRows[0];
    if (!existingRow) return null;
    const existing = mapContract(existingRow);

    const nextStatus = input.status ?? existing.status;
    let signedAt = existing.signedAt;
    let sentAt = existing.sentAt;
    let endedAt = existing.endedAt;

    if (input.status === "pending_signature" && !sentAt) {
      sentAt = new Date().toISOString();
    }
    if ((input.status === "signed" || input.status === "active") && !signedAt) {
      signedAt = new Date().toISOString();
    }
    if (input.status === "ended") {
      endedAt = endedAt ?? new Date().toISOString();
    } else if (input.status) {
      endedAt = null;
    }

    const nextType = input.contractType ?? existing.contractType;
    const nextClauses = input.resetClausesFromTemplate
      ? buildDefaultClauses(nextType)
      : input.clauses !== undefined
        ? input.clauses
        : existing.clauses;
    const nextBenefits =
      input.benefits !== undefined ? input.benefits : existing.benefits;
    const nextMissions =
      input.missions !== undefined
        ? input.missions?.trim() || buildDefaultMissions(nextType)
        : existing.missions;
    const nextInternalRef =
      input.internalReference !== undefined
        ? input.internalReference?.trim() || null
        : existing.internalReference;

    const { rows } = await query<EmployeeContractRow>(
      `WITH updated AS (
         UPDATE employee_contracts SET
           contract_type = $2,
           title = $3,
           status = $4,
           start_date = $5::date,
           end_date = $6::date,
           trial_end_date = $7::date,
           job_title = $8,
           department = $9,
           work_location = $10,
           weekly_hours = $11,
           compensation_amount = $12,
           compensation_currency = $13,
           compensation_period = $14,
           reminder_days_before = $15,
           notes = $16,
           document_s3_key = $17,
           document_name = $18,
           signed_at = $19,
           sent_at = $20,
           ended_at = $21,
           internal_reference = $22,
           missions = $23,
           benefits = $24::jsonb,
           clauses = $25::jsonb,
           updated_at = NOW()
         WHERE id = $1
         RETURNING *
       )
       SELECT u.*,
              cu.name AS user_name,
              COALESCE(cu.personal_email, cu.email) AS user_email
       FROM updated u
       LEFT JOIN crm_users cu ON cu.id = u.user_id`,
      [
        id,
        nextType,
        input.title ?? existing.title,
        nextStatus,
        input.startDate !== undefined ? input.startDate : existing.startDate,
        input.endDate !== undefined ? input.endDate : existing.endDate,
        input.trialEndDate !== undefined ? input.trialEndDate : existing.trialEndDate,
        input.jobTitle !== undefined ? input.jobTitle?.trim() || null : existing.jobTitle,
        input.department !== undefined ? input.department?.trim() || null : existing.department,
        input.workLocation !== undefined
          ? input.workLocation?.trim() || null
          : existing.workLocation,
        input.weeklyHours !== undefined ? input.weeklyHours : existing.weeklyHours,
        input.compensationAmount !== undefined
          ? input.compensationAmount
          : existing.compensationAmount,
        input.compensationCurrency ?? existing.compensationCurrency,
        input.compensationPeriod ?? existing.compensationPeriod,
        input.reminderDaysBefore ?? existing.reminderDaysBefore,
        input.notes !== undefined ? input.notes?.trim() || null : existing.notes,
        input.documentS3Key !== undefined ? input.documentS3Key : existing.documentS3Key,
        input.documentName !== undefined ? input.documentName : existing.documentName,
        signedAt,
        sentAt,
        endedAt,
        nextInternalRef,
        nextMissions,
        JSON.stringify(nextBenefits),
        JSON.stringify(nextClauses),
      ],
    );
    return rows[0] ? mapContract(rows[0]) : null;
  });
}

export async function deleteEmployeeContract(id: string): Promise<boolean> {
  return withDb(async (query) => {
    const { rowCount } = await query(`DELETE FROM employee_contracts WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  });
}

export async function listExpiringEmployeeContracts(
  withinDays = 45,
): Promise<EmployeeContract[]> {
  return withDb(async (query) => {
    const { rows } = await query<EmployeeContractRow>(
      `${selectSql}
       WHERE ec.end_date IS NOT NULL
         AND ec.status IN ('active', 'signed', 'pending_signature')
         AND ec.end_date <= (CURRENT_DATE + ($1::int * INTERVAL '1 day'))
         AND ec.end_date >= CURRENT_DATE
       ORDER BY ec.end_date ASC`,
      [withinDays],
    );
    return rows.map(mapContract);
  });
}

export type EmployeeContractSignatureProof = {
  signerName: string;
  signerEmail: string;
  signatureData: string;
  signatureHash: string;
  documentSha256: string | null;
  signedAt: string;
  proofS3Key: string | null;
  provider: string;
};

export async function getEmployeeContractSignatureProof(
  contractId: string,
): Promise<EmployeeContractSignatureProof | null> {
  return withDb(async (query) => {
    const { rows } = await query<{
      signer_name: string;
      signer_email: string;
      signature_data: string;
      signature_hash: string;
      document_sha256: string | null;
      signed_at: Date;
      proof_s3_key: string | null;
      provider: string;
    }>(
      `SELECT signer_name, signer_email, signature_data, signature_hash,
              document_sha256, signed_at, proof_s3_key, provider
       FROM employee_contract_signatures
       WHERE contract_id = $1
       LIMIT 1`,
      [contractId],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      signerName: row.signer_name,
      signerEmail: row.signer_email,
      signatureData: row.signature_data,
      signatureHash: row.signature_hash,
      documentSha256: row.document_sha256,
      signedAt: row.signed_at.toISOString(),
      proofS3Key: row.proof_s3_key,
      provider: row.provider,
    };
  });
}
