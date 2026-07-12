import { z } from "zod";
import { withDb } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { createLeadActivity } from "@/lib/lead-activities";
import { getLeadById } from "@/lib/leads";
import { listFiredReminderKeysForChannel, markRemindersFired } from "@/lib/crm-reminders";

export type MarketingSequence = {
  id: string;
  name: string;
  triggerStatus: string;
  isActive: boolean;
  steps: MarketingSequenceStep[];
};

export type MarketingSequenceStep = {
  id: string;
  sequenceId: string;
  delayDays: number;
  subject: string;
  htmlBody: string;
  sortOrder: number;
};

type EnrollmentRow = {
  id: string;
  lead_id: string;
  sequence_id: string;
  current_step: number;
  enrolled_at: Date;
  last_sent_at: Date | null;
};

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

export async function listMarketingSequences(): Promise<MarketingSequence[]> {
  return withDb(async (query) => {
    const { rows: seqs } = await query<{
      id: string;
      name: string;
      trigger_status: string;
      is_active: boolean;
    }>(`SELECT * FROM marketing_sequences ORDER BY created_at ASC`);

    const result: MarketingSequence[] = [];
    for (const seq of seqs) {
      const { rows: steps } = await query<{
        id: string;
        sequence_id: string;
        delay_days: number;
        subject: string;
        html_body: string;
        sort_order: number;
      }>(
        `SELECT * FROM marketing_sequence_steps WHERE sequence_id = $1 ORDER BY sort_order ASC`,
        [seq.id],
      );
      result.push({
        id: seq.id,
        name: seq.name,
        triggerStatus: seq.trigger_status,
        isActive: seq.is_active,
        steps: steps.map((s) => ({
          id: s.id,
          sequenceId: s.sequence_id,
          delayDays: s.delay_days,
          subject: s.subject,
          htmlBody: s.html_body,
          sortOrder: s.sort_order,
        })),
      });
    }
    return result;
  });
}

export async function enrollLeadInActiveSequences(leadId: string, status: string): Promise<void> {
  await withDb(async (query) => {
    const { rows } = await query<{ id: string }>(
      `SELECT id FROM marketing_sequences WHERE is_active = true AND trigger_status = $1`,
      [status],
    );
    for (const seq of rows) {
      await query(
        `INSERT INTO lead_sequence_enrollments (lead_id, sequence_id)
         VALUES ($1, $2) ON CONFLICT (lead_id, sequence_id) DO NOTHING`,
        [leadId, seq.id],
      );
    }
  });
}

function buildSequenceReminderKey(enrollmentId: string, stepIndex: number): string {
  return `marketing-sequence:${enrollmentId}:${stepIndex}`;
}

export async function processMarketingSequences(now = new Date()): Promise<{ sent: number; skipped: number }> {
  const sequences = await listMarketingSequences();
  const active = sequences.filter((s) => s.isActive && s.steps.length > 0);
  if (active.length === 0) return { sent: 0, skipped: 0 };

  return withDb(async (query) => {
    const { rows: enrollments } = await query<EnrollmentRow>(
      `SELECT * FROM lead_sequence_enrollments WHERE completed_at IS NULL`,
    );

    const keys = enrollments.map((e) => buildSequenceReminderKey(e.id, e.current_step));
    const fired = await listFiredReminderKeysForChannel(keys, "email");

    let sent = 0;
    let skipped = 0;

    for (const enrollment of enrollments) {
      const sequence = active.find((s) => s.id === enrollment.sequence_id);
      if (!sequence) continue;

      const step = sequence.steps[enrollment.current_step];
      if (!step) {
        await query(
          `UPDATE lead_sequence_enrollments SET completed_at = NOW() WHERE id = $1`,
          [enrollment.id],
        );
        continue;
      }

      const enrolledAt = enrollment.enrolled_at.getTime();
      const dueAt = enrolledAt + step.delayDays * 86_400_000;
      if (now.getTime() < dueAt) continue;

      const reminderKey = buildSequenceReminderKey(enrollment.id, enrollment.current_step);
      if (fired.has(reminderKey)) {
        skipped += 1;
        continue;
      }

      const lead = await getLeadById(enrollment.lead_id);
      if (!lead?.email) {
        skipped += 1;
        continue;
      }

      const vars = {
        name: lead.name,
        company: lead.company ?? "",
        service: lead.service ?? "",
      };

      const ok = await sendEmail({
        to: lead.email,
        subject: renderTemplate(step.subject, vars),
        html: renderTemplate(step.htmlBody, vars),
      });

      if (!ok) {
        skipped += 1;
        continue;
      }

      await createLeadActivity({
        leadId: lead.id,
        type: "email_sent",
        subject: step.subject,
        content: `Séquence « ${sequence.name} » — étape ${enrollment.current_step + 1}`,
        actorName: "Automatisation",
      });

      const nextStep = enrollment.current_step + 1;
      if (nextStep >= sequence.steps.length) {
        await query(
          `UPDATE lead_sequence_enrollments
           SET current_step = $2, last_sent_at = NOW(), completed_at = NOW()
           WHERE id = $1`,
          [enrollment.id, nextStep],
        );
      } else {
        await query(
          `UPDATE lead_sequence_enrollments
           SET current_step = $2, last_sent_at = NOW()
           WHERE id = $1`,
          [enrollment.id, nextStep],
        );
      }

      await markRemindersFired([
        {
          key: reminderKey,
          itemId: enrollment.id,
          itemType: "marketing_sequence",
          title: sequence.name,
          triggerAt: now.toISOString(),
          channels: ["email"],
        },
      ]);
      sent += 1;
    }

    return { sent, skipped };
  });
}

export async function seedMarketingSequences(
  query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount: number | null }>,
): Promise<void> {
  const { rows } = await query(
    `SELECT COUNT(*)::text AS count FROM marketing_sequences`,
  );
  if (Number((rows[0] as { count: string })?.count ?? 0) > 0) return;

  const { rows: seqRows } = await query(
    `INSERT INTO marketing_sequences (name, trigger_status, is_active)
     VALUES ('Audit gratuit → proposition', 'new', true) RETURNING id`,
  );
  const sequenceId = (seqRows[0] as { id: string }).id;

  const steps = [
    {
      delay: 0,
      subject: "Votre audit gratuit — SD CREATIV",
      body: `<p>Bonjour {{name}},</p><p>Merci pour votre intérêt. Nous préparons votre audit gratuit pour {{service}}.</p><p>L'équipe SD CREATIV</p>`,
    },
    {
      delay: 3,
      subject: "Relance — votre projet digital",
      body: `<p>Bonjour {{name}},</p><p>Petit rappel : nous restons disponibles pour avancer sur {{service}}.</p>`,
    },
    {
      delay: 7,
      subject: "Proposition personnalisée — SD CREATIV",
      body: `<p>Bonjour {{name}},</p><p>Prêt(e) à recevoir une proposition adaptée à {{company}} ? Répondez à cet email.</p>`,
    },
  ];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;
    await query(
      `INSERT INTO marketing_sequence_steps (sequence_id, delay_days, subject, html_body, sort_order)
       VALUES ($1, $2, $3, $4, $5)`,
      [sequenceId, step.delay, step.subject, step.body, i],
    );
  }
}

export const updateSequenceSchema = z.object({
  isActive: z.boolean().optional(),
});

export async function updateMarketingSequence(
  id: string,
  input: z.infer<typeof updateSequenceSchema>,
): Promise<void> {
  if (input.isActive === undefined) return;
  await withDb(async (query) => {
    await query(`UPDATE marketing_sequences SET is_active = $2 WHERE id = $1`, [
      id,
      input.isActive,
    ]);
  });
}
