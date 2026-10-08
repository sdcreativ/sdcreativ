import type { Metadata } from "next";
import { UnsubscribePanel } from "@/components/marketing/UnsubscribePanel";
import { verifyUnsubscribeToken } from "@/lib/email-unsubscribe";

export const metadata: Metadata = {
  title: "Désinscription",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ t?: string }> };

/** a***@exemple.com : confirme l'adresse sans l'exposer en entier. */
function maskEmail(email: string): string {
  const [user = "", domain = ""] = email.split("@");
  return `${user.slice(0, 1)}***@${domain}`;
}

export default async function UnsubscribePage({ searchParams }: Props) {
  const { t } = await searchParams;
  const email = verifyUnsubscribeToken(t);

  return (
    <main className="min-h-[60vh] bg-gray-light/40 px-4 py-12">
      <div className="mx-auto max-w-lg rounded-2xl border border-gray/40 bg-white p-6 shadow-sm md:p-8">
        <h1 className="text-xl font-bold text-foreground">Désinscription</h1>
        <div className="mt-4">
          {email && t ? (
            <UnsubscribePanel token={t} maskedEmail={maskEmail(email)} />
          ) : (
            <p className="text-sm text-gray-text">
              Ce lien de désinscription n’est pas valide. Écrivez-nous à contact@sdcreativ.com et nous vous retirerons
              de nos envois.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
