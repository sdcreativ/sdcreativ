import { Megaphone } from "lucide-react";
import { isDatabaseConfigured } from "@/lib/db";
import { verifyPromoEnrollmentToken } from "@/lib/promo-campaign-token";
import { getEnrollmentPublicView } from "@/lib/promo-campaigns";
import { PromoConfirmButton } from "@/components/promo/PromoConfirmButton";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function PromoInterestPage({ params }: Props) {
  const { token: rawToken } = await params;
  const token = decodeURIComponent(rawToken);

  if (!isDatabaseConfigured()) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm text-gray-600">Service temporairement indisponible.</p>
      </main>
    );
  }

  const verified = verifyPromoEnrollmentToken(token);
  if (!verified) {
    return (
      <main className="min-h-screen bg-[#eef2f7] px-4 py-12">
        <div className="mx-auto max-w-lg rounded-2xl border border-gray/40 bg-white p-6 text-center shadow-sm md:p-8">
          <h1 className="text-xl font-bold text-foreground">Lien invalide ou expiré</h1>
          <p className="mt-3 text-sm text-gray-600">
            Contactez SD CREATIV si vous souhaitez toujours profiter de cette offre.
          </p>
        </div>
      </main>
    );
  }

  const view = await getEnrollmentPublicView(verified.enrollmentId);
  if (!view) {
    return (
      <main className="min-h-screen bg-[#eef2f7] px-4 py-12">
        <div className="mx-auto max-w-lg rounded-2xl border border-gray/40 bg-white p-6 text-center shadow-sm md:p-8">
          <h1 className="text-xl font-bold text-foreground">Offre introuvable</h1>
        </div>
      </main>
    );
  }

  const { campaign, enrollment } = view;
  const alreadyConfirmed =
    enrollment.status === "confirmed" || enrollment.status === "converted";
  const ended = campaign.status === "ended" && !alreadyConfirmed;
  const trackClick =
    !alreadyConfirmed && !ended && (enrollment.status === "sent" || enrollment.status === "clicked");

  return (
    <main className="min-h-screen bg-[#eef2f7] px-4 py-12">
      <div className="mx-auto max-w-lg rounded-2xl border border-gray/40 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Megaphone className="h-8 w-8" aria-hidden />
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
            SD CREATIV
          </p>
          <h1 className="mt-1 text-xl font-bold text-foreground">{campaign.offerTitle}</h1>
          {campaign.offerDescription ? (
            <p className="mt-3 text-sm text-gray-600">{campaign.offerDescription}</p>
          ) : null}
          {enrollment.quoteReference ? (
            <p className="mt-2 text-xs text-gray-500">
              Devis {enrollment.quoteReference}
              {enrollment.contactName ? ` — ${enrollment.contactName}` : ""}
            </p>
          ) : null}
        </div>

        <div className="mt-8">
          {ended ? (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
              Cette offre est terminée. Merci pour votre intérêt.
            </p>
          ) : alreadyConfirmed ? (
            <p className="rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-800">
              Merci — votre intérêt est bien enregistré. Un conseiller vous recontacte rapidement.
            </p>
          ) : (
            <PromoConfirmButton token={token} trackClick={trackClick} />
          )}
        </div>
      </div>
    </main>
  );
}
