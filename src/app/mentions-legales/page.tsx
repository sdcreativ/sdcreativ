import Link from "next/link";
import { SitePageHero } from "@/components/ui/SitePageHero";
import { SITE } from "@/lib/constants";
import { getSiteLegalSettings } from "@/lib/site-legal-settings";
import { getSitePublicSettings } from "@/lib/site-public-settings";
import { createMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export const metadata = createMetadata({
  title: "Mentions légales",
  description:
    "Mentions légales du site SD CREATIV — informations éditeur, hébergement et propriété intellectuelle.",
  path: "/mentions-legales",
});

export default async function MentionsLegalesPage() {
  const [{ contact, legal }, legalContent] = await Promise.all([
    getSitePublicSettings(),
    getSiteLegalSettings(),
  ]);

  return (
    <>
      <SitePageHero pageKey="mentions-legales" />

      <section className="py-16 md:py-20">
        <div className="container mx-auto max-w-3xl px-4 prose prose-neutral md:px-6 lg:px-8">
          <h2>Éditeur du site</h2>
          <p>
            Le site <strong>{SITE.url}</strong> est édité par :
          </p>
          <ul>
            <li>
              <strong>Raison sociale :</strong> {SITE.name}
            </li>
            <li>
              <strong>Forme juridique :</strong> {legalContent.legalForm}
            </li>
            {legal.rccm ? (
              <li>
                <strong>RCCM :</strong> {legal.rccm}
              </li>
            ) : (
              <li>
                <strong>RCCM :</strong> [Numéro RCCM — renseigner dans Paramètres CRM → Site
                public]
              </li>
            )}
            {legal.ncc ? (
              <li>
                <strong>Compte contribuable (NCC) :</strong> {legal.ncc}
              </li>
            ) : null}
            <li>
              <strong>Siège social :</strong> {contact.address}
            </li>
            <li>
              <strong>Email :</strong> {contact.email}
            </li>
            <li>
              <strong>Téléphone :</strong> {contact.phone}
            </li>
          </ul>

          <h2>Directeur de la publication</h2>
          <p>{legalContent.publicationDirector}</p>

          <h2>Hébergement</h2>
          <p>
            Le site est hébergé par <strong>{legal.hostName}</strong>
            {legal.hostAddress ? <>, {legal.hostAddress}.</> : "."}
          </p>

          {legalContent.mentionsSections.map((section) => (
            <div key={section.id}>
              <h2>{section.title}</h2>
              {section.paragraphs?.map((p) => (
                <p key={p.slice(0, 40)}>{p}</p>
              ))}
              {section.bullets && section.bullets.length > 0 && (
                <ul>
                  {section.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
              {section.id === "donnees" && (
                <p>
                  <Link href="/politique-confidentialite">Politique de confidentialité →</Link>
                </p>
              )}
            </div>
          ))}

          <h2>Droit applicable</h2>
          <p>
            Les présentes mentions légales sont régies par le droit ivoirien. En cas de litige,
            les tribunaux compétents d&apos;Abidjan seront seuls compétents.
          </p>
        </div>
      </section>
    </>
  );
}
