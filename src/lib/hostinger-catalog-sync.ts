import { fetchHostingCatalog, syncHostingCatalog, type CatalogChange } from "@/lib/hostinger-catalog";
import { sendEmail } from "@/lib/email";
import { escapeHtml } from "@/lib/blog-content";
import { recomputeAutoPlans } from "@/lib/public-pricing";
import { revalidatePricingPages } from "@/lib/site-revalidate";

const eur = (cents: number) => (cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Synchro complète (API → base) + e-mail admin si des prix changent. Partagé admin / cron. */
export async function runHostingCatalogSync(): Promise<{
  packs: number;
  prices: number;
  inserted: number;
  plansUpdated: number;
  changes: CatalogChange[];
}> {
  const token = process.env.HOSTINGER_API_TOKEN?.trim();
  if (!token) throw new Error("HOSTINGER_API_TOKEN non configuré (.env.docker).");
  const entries = await fetchHostingCatalog(token);
  if (!entries.length) throw new Error("Catalogue Hostinger vide : aucun prix d'hébergement reçu.");
  const result = await syncHostingCatalog(entries);

  // Nouveaux packs/durées (ex. 1re synchro) : les formules qui les utilisent passent des prix
  // manuels aux prix du catalogue. Les changements de prix existants restent, eux, en attente.
  let plansUpdated = 0;
  if (result.inserted > 0) {
    plansUpdated = await recomputeAutoPlans();
    revalidatePricingPages();
  }

  if (result.changes.length > 0) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
    const rows = result.changes
      .map(
        (c) =>
          `<li>${escapeHtml(c.packName)} ${c.months} mois : promo ${eur(c.before.promoCents)} € → <strong>${eur(c.after.promoCents)} €</strong>, ` +
          `renouvellement ${eur(c.before.renewalCents)} € → <strong>${eur(c.after.renewalCents)} €</strong></li>`,
      )
      .join("");
    await sendEmail({
      subject: `[SD CREATIV CRM] Hostinger a changé ses prix (${result.changes.length})`,
      html: `<p>La synchronisation du catalogue Hostinger a détecté de nouveaux prix (HT) :</p><ul>${rows}</ul>
             <p>Ils ne sont <strong>pas encore publiés</strong>. Vérifiez-les puis cliquez sur « Appliquer les nouveaux prix » :</p>
             <p><a href="${siteUrl}/admin/crm/site/tarifs">Ouvrir les tarifs</a></p>`,
    });
  }
  return { ...result, plansUpdated };
}
