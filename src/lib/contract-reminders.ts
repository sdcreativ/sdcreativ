import { listContractsDueForReminder } from "@/lib/contracts";
import { listFiredReminderKeysForChannel, markRemindersFired } from "@/lib/crm-reminders";
import { sendEmail } from "@/lib/email";

export function buildContractReminderKey(contractId: string): string {
  return `contract-expiry:${contractId}`;
}

export async function processContractReminders(): Promise<{ sent: number; skipped: number }> {
  const contracts = await listContractsDueForReminder();
  if (contracts.length === 0) return { sent: 0, skipped: 0 };

  const keys = contracts.map((c) => buildContractReminderKey(c.id));
  const fired = await listFiredReminderKeysForChannel(keys, "email");
  let sent = 0;
  let skipped = 0;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";

  for (const contract of contracts) {
    const key = buildContractReminderKey(contract.id);
    if (fired.has(key)) {
      skipped += 1;
      continue;
    }

    await sendEmail({
      subject: `[SD CREATIV CRM] Échéance contrat — ${contract.reference}`,
      html: `
        <p>Le contrat <strong>${contract.title}</strong> (${contract.reference}) arrive à échéance le <strong>${contract.endDate}</strong>.</p>
        <p>Client : ${contract.clientName ?? "—"}</p>
        <p><a href="${siteUrl}/admin/crm/factures?tab=contrats">Voir les contrats</a></p>
      `,
    });

    await markRemindersFired([
      {
        key,
        itemId: contract.id,
        itemType: "contract",
        title: contract.title,
        triggerAt: new Date().toISOString(),
        channels: ["email", "in_app"],
      },
    ]);
    sent += 1;
  }

  return { sent, skipped };
}
