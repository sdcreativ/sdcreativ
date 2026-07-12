import { z } from "zod";
import { withDb } from "@/lib/db";
import type { CareerApplicationStatus } from "@/content/priority3-labels";
import { CAREER_APPLICATION_STATUSES } from "@/content/priority3-labels";

export type CareerApplication = {
  id: string;
  jobId: string;
  jobLabel: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  experience: string | null;
  availability: string | null;
  hasVehicle: string | null;
  linkedin: string | null;
  cvLink: string | null;
  motivation: string;
  status: CareerApplicationStatus;
  createdAt: string;
};

export const createCareerApplicationSchema = z.object({
  jobId: z.string().trim().min(1).max(80),
  jobLabel: z.string().trim().min(1).max(200),
  name: z.string().trim().min(2).max(160),
  email: z.string().email(),
  phone: z.string().trim().max(32).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  experience: z.string().trim().max(40).optional().nullable(),
  availability: z.string().trim().max(40).optional().nullable(),
  hasVehicle: z.string().trim().max(10).optional().nullable(),
  linkedin: z.string().trim().max(500).optional().nullable(),
  cvLink: z.string().trim().max(500).optional().nullable(),
  motivation: z.string().trim().min(10).max(10000),
});

function mapRow(row: {
  id: string;
  job_id: string;
  job_label: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  experience: string | null;
  availability: string | null;
  has_vehicle: string | null;
  linkedin: string | null;
  cv_link: string | null;
  motivation: string;
  status: CareerApplicationStatus;
  created_at: Date;
}): CareerApplication {
  return {
    id: row.id,
    jobId: row.job_id,
    jobLabel: row.job_label,
    name: row.name,
    email: row.email,
    phone: row.phone,
    city: row.city,
    experience: row.experience,
    availability: row.availability,
    hasVehicle: row.has_vehicle,
    linkedin: row.linkedin,
    cvLink: row.cv_link,
    motivation: row.motivation,
    status: row.status,
    createdAt: row.created_at.toISOString(),
  };
}

export async function listCareerApplications(filters?: {
  status?: CareerApplicationStatus;
  jobId?: string;
}): Promise<CareerApplication[]> {
  return withDb(async (query) => {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (filters?.status) {
      params.push(filters.status);
      clauses.push(`status = $${params.length}`);
    }
    if (filters?.jobId) {
      params.push(filters.jobId);
      clauses.push(`job_id = $${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const { rows } = await query(
      `SELECT * FROM career_applications ${where} ORDER BY created_at DESC`,
      params,
    );
    return rows.map(mapRow);
  });
}

export async function createCareerApplication(
  input: z.infer<typeof createCareerApplicationSchema>,
): Promise<CareerApplication> {
  return withDb(async (query) => {
    const { rows } = await query(
      `INSERT INTO career_applications (
        job_id, job_label, name, email, phone, city, experience,
        availability, has_vehicle, linkedin, cv_link, motivation
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        input.jobId,
        input.jobLabel,
        input.name,
        input.email,
        input.phone ?? null,
        input.city ?? null,
        input.experience ?? null,
        input.availability ?? null,
        input.hasVehicle ?? null,
        input.linkedin ?? null,
        input.cvLink ?? null,
        input.motivation,
      ],
    );
    return mapRow(rows[0] as Parameters<typeof mapRow>[0]);
  });
}

export async function updateCareerApplicationStatus(
  id: string,
  status: CareerApplicationStatus,
): Promise<CareerApplication | null> {
  if (!CAREER_APPLICATION_STATUSES.includes(status)) return null;
  return withDb(async (query) => {
    const { rows } = await query(
      `UPDATE career_applications SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, status],
    );
    return rows[0] ? mapRow(rows[0] as Parameters<typeof mapRow>[0]) : null;
  });
}
