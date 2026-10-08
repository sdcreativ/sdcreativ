import { getClientById } from "@/lib/clients";
import { findMaintenanceBenefitForClient } from "@/lib/client-benefits";
import { getContractById, patchContractMaintenance, type Contract } from "@/lib/contracts";
import { withDb } from "@/lib/db";
import {
  maintenanceSchedule,
  maintenanceSubscriptionTitle,
  readMaintenanceTerms,
  type MaintenanceTerms,
  type MaintenanceTermsInput,
} from "@/lib/maintenance-contract";
import { createSubscription, type Subscription } from "@/lib/subscriptions";

/**
 * Conditions à enregistrer à la création : l'avantage promis au client (code popup, devis) est figé
 * dans le contrat pour y figurer en clair.
 */
export async function resolveMaintenanceTerms(
  input: MaintenanceTermsInput,
  ctx: { clientId: string; quoteId?: string | null },
): Promise<MaintenanceTerms> {
  const client = await getClientById(ctx.clientId);
  const benefit = client
    ? await findMaintenanceBenefitForClient({ id: client.id, email: client.email }, ctx.quoteId)
    : null;
  return {
    ...input,
    benefit: benefit
      ? { promoCode: benefit.promoCode, percent: benefit.percent, startsOn: benefit.startsOn, endsOn: benefit.endsOn }
      : null,
    subscriptionId: null,
  };
}

export type MaintenanceSubscriptionResult =
  | { status: "created" | "existing"; subscription: Subscription | null; contract: Contract }
  | { status: "skipped"; reason: string };

/**
 * Contrat de maintenance signé → abonnement de facturation (idempotent). Première échéance à la fin de
 * la période incluse ; la remise promise s'appliquera seule aux factures de sa période.
 */
export async function ensureMaintenanceSubscription(contractId: string): Promise<MaintenanceSubscriptionResult> {
  const contract = await getContractById(contractId);
  if (!contract) return { status: "skipped", reason: "Contrat introuvable." };
  const terms = readMaintenanceTerms(contract.metadata);
  if (!terms) return { status: "skipped", reason: "Ce contrat n'est pas un contrat de maintenance." };
  if (!["signed", "linked"].includes(contract.status)) {
    return { status: "skipped", reason: "Le contrat doit d'abord être signé." };
  }
  if (!contract.startDate) return { status: "skipped", reason: "Date de prise d'effet manquante." };

  const existing = await withDb(async (query) => {
    const { rows } = await query<{ id: string }>(
      `SELECT id FROM crm_subscriptions WHERE contract_id = $1 AND status <> 'cancelled' LIMIT 1`,
      [contract.id],
    );
    return rows[0]?.id ?? null;
  });
  if (existing) {
    if (terms.subscriptionId !== existing) await patchContractMaintenance(contract.id, { subscriptionId: existing });
    return { status: "existing", subscription: null, contract: (await getContractById(contract.id))! };
  }

  const { paidFrom } = maintenanceSchedule(terms, contract.startDate);
  const title = maintenanceSubscriptionTitle(terms);
  const subscription = await createSubscription({
    clientId: contract.clientId,
    projectId: contract.projectId,
    contractId: contract.id,
    title,
    amount: terms.priceHt,
    interval: terms.billingInterval,
    nextBillingDate: paidFrom,
    renewalReminderDays: terms.billingInterval === "yearly" ? 30 : 7,
    tvaRate: terms.vatRate,
    lines: [{ label: title, amount: terms.priceHt }],
  });
  await patchContractMaintenance(contract.id, { subscriptionId: subscription.id });
  return { status: "created", subscription, contract: (await getContractById(contract.id))! };
}

/** Variante appelée après une signature : ne bloque jamais la signature elle-même. */
export async function ensureMaintenanceSubscriptionSafely(contractId: string): Promise<void> {
  try {
    await ensureMaintenanceSubscription(contractId);
  } catch (error) {
    console.error("[maintenance-contracts] création de l'abonnement impossible", contractId, error);
  }
}
