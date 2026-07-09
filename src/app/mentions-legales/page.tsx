import { SitePageHero } from "@/components/ui/SitePageHero";
import { SITE } from "@/lib/constants";
import { getSitePublicSettings } from "@/lib/site-public-settings";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Mentions légales",
  description: "Mentions légales du site SD CREATIV — informations éditeur, hébergement et propriété intellectuelle.",
  path: "/mentions-legales",
});

export default async function MentionsLegalesPage() {
  const { contact, legal } = await getSitePublicSettings();

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
            <li><strong>Raison sociale :</strong> {SITE.name}</li>
            <li><strong>Forme juridique :</strong> Société à responsabilité limitée (SARL) ou équivalent</li>
            {legal.rccm ? (
              <li><strong>RCCM :</strong> {legal.rccm}</li>
            ) : (
              <li><strong>RCCM :</strong> [Numéro RCCM — renseigner dans Paramètres CRM → Site public]</li>
            )}
            {legal.ncc ? (
              <li><strong>Compte contribuable (NCC) :</strong> {legal.ncc}</li>
            ) : null}
            <li><strong>Siège social :</strong> {contact.address}</li>
            <li><strong>Email :</strong> {contact.email}</li>
            <li><strong>Téléphone :</strong> {contact.phone}</li>
          </ul>

          <h2>Directeur de la publication</h2>
          <p>Le directeur de la publication est le représentant légal de {SITE.name}.</p>

          <h2>Hébergement</h2>
          <p>
            Le site est hébergé par <strong>{legal.hostName}</strong>
            {legal.hostAddress ? (
              <>
                , {legal.hostAddress}.
              </>
            ) : (
              "."
            )}
          </p>

          <h2>Propriété intellectuelle</h2>
          <p>
            L&apos;ensemble du contenu de ce site (textes, images, graphismes, logo, icônes, sons,
            logiciels) est la propriété exclusive de {SITE.name} ou de ses partenaires, sauf
            mention contraire. Toute reproduction, représentation, modification, publication ou
            adaptation de tout ou partie des éléments du site, quel que soit le moyen ou le
            procédé utilisé, est interdite sans autorisation écrite préalable.
          </p>

          <h2>Données personnelles</h2>
          <p>
            Pour toute information relative à la collecte et au traitement de vos données
            personnelles, consultez notre{" "}
            <a href="/politique-confidentialite">politique de confidentialité</a>.
          </p>

          <h2>Cookies</h2>
          <p>
            Ce site utilise des cookies pour améliorer l&apos;expérience utilisateur et mesurer
            l&apos;audience. Vous pouvez gérer vos préférences via la bannière cookies ou notre
            politique de confidentialité.
          </p>

          <h2>Limitation de responsabilité</h2>
          <p>
            {SITE.name} s&apos;efforce d&apos;assurer l&apos;exactitude des informations diffusées
            sur ce site. Toutefois, elle ne saurait garantir l&apos;exactitude, la complétude ou
            l&apos;actualité des informations mises à disposition.
          </p>

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
