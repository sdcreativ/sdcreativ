import { isDatabaseConfigured, withDb } from "@/lib/db";
import { CRM_DOC_ONBOARDING_WEEK } from "@/content/crm-docs/onboarding-week";

export async function listCrmDocOnboardingProgress(userId: string): Promise<string[]> {
  if (!isDatabaseConfigured() || !userId || userId === "legacy") return [];
  return withDb(async (query) => {
    const { rows } = await query<{ step_id: string }>(
      `SELECT step_id FROM crm_doc_onboarding_progress WHERE user_id = $1`,
      [userId],
    );
    return rows.map((r) => r.step_id);
  });
}

export async function setCrmDocOnboardingStep(
  userId: string,
  stepId: string,
  completed: boolean,
): Promise<string[]> {
  if (!isDatabaseConfigured() || !userId || userId === "legacy") {
    throw new Error("Progression indisponible.");
  }
  const valid = CRM_DOC_ONBOARDING_WEEK.some((s) => s.id === stepId);
  if (!valid) throw new Error("Étape inconnue.");

  return withDb(async (query) => {
    if (completed) {
      await query(
        `INSERT INTO crm_doc_onboarding_progress (user_id, step_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [userId, stepId],
      );
    } else {
      await query(
        `DELETE FROM crm_doc_onboarding_progress WHERE user_id = $1 AND step_id = $2`,
        [userId, stepId],
      );
    }
    const { rows } = await query<{ step_id: string }>(
      `SELECT step_id FROM crm_doc_onboarding_progress WHERE user_id = $1`,
      [userId],
    );
    return rows.map((r) => r.step_id);
  });
}
