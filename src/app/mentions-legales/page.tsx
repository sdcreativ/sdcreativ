import { PageHero } from "@/components/ui/PageHero";
import { CONTACT, LEGAL, SITE } from "@/lib/constants";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Mentions légales",
  description: "Mentions légales du site SD CREATIV — informations éditeur, hébergement et propriété intellectuelle.",
  path: "/mentions-legales",
});

export default function MentionsLegalesPage() {
  return (
    <>
      <PageHero
        eyebrow="Informations légales"
        title="Mentions"
        highlight="légales"
      />

      <section className="py-16 md:py-20">
        <div className="container mx-auto max-w-3xl px-4 prose prose-neutral md:px-6 lg:px-8">
          <h2>Éditeur du site</h2>
          <p>
            Le site <strong>{SITE.url}</strong> est édité par :
          </p>
          <ul>
            <li><strong>Raison sociale :</strong> {SITE.name}</li>
            <li><strong>Forme juridique :</strong> Société à responsabilité limitée (SARL) ou équivalent</li>
            {LEGAL.rccm ? (
              <li><strong>RCCM :</strong> {LEGAL.rccm}</li>
            ) : (
              <li><strong>RCCM :</strong> [Numéro RCCM — renseigner NEXT_PUBLIC_LEGAL_RCCM]</li>
            )}
            {LEGAL.ncc ? (
              <li><strong>Compte contribuable (NCC) :</strong> {LEGAL.ncc}</li>
            ) : null}
            <li><strong>Siège social :</strong> {CONTACT.address}</li>
            <li><strong>Email :</strong> {CONTACT.email}</li>
            <li><strong>Téléphone :</strong> {CONTACT.phone}</li>
          </ul>

          <h2>Directeur de la publication</h2>
          <p>Le directeur de la publication est le représentant légal de {SITE.name}.</p>

          <h2>Hébergement</h2>
          <p>
            Le site est hébergé par <strong>{LEGAL.hostName}</strong>
            {LEGAL.hostAddress ? (
              <>
                , {LEGAL.hostAddress}.
              </>
            ) : (
              "."
            )}
          </p>
          <p className="text-sm text-gray-text">
            Les informations d&apos;hébergement peuvent être mises à jour via les variables{" "}
            <code>NEXT_PUBLIC_HOST_NAME</code> et <code>NEXT_PUBLIC_HOST_ADDRESS</code> en
            production.
          </p>

          <h2>Propriété intellectuelle</h2>
          <p>
            L&apos;ensemble du contenu de ce site (textes, images, logos, graphismes, icônes, sons,
            logiciels) est la propriété exclusive de {SITE.name} ou de ses partenaires et est
            protégé par les lois en vigueur sur la propriété intellectuelle.
          </p>
          <p>
            Toute reproduction, représentation, modification ou exploitation, totale ou partielle,
            sans autorisation préalable écrite est strictement interdite.
          </p>

          <h2>Crédits</h2>
          <p>
            Conception, développement et maintenance du site : {SITE.name}. Icônes : Lucide Icons.
            Polices : Poppins (Google Fonts).
          </p>

          <h2>Limitation de responsabilité</h2>
          <p>
            {SITE.name} s&apos;efforce d&apos;assurer l&apos;exactitude des informations diffusées
            sur ce site. Toutefois, l&apos;éditeur ne saurait garantir l&apos;exactitude, la
            complétude ou l&apos;actualité des informations mises à disposition.
          </p>
          <p>
            Les tarifs et délais indiqués sur le site sont donnés à titre indicatif et peuvent
            varier selon la complexité du projet.
          </p>

          <h2>Liens hypertextes</h2>
          <p>
            Le site peut contenir des liens vers des sites tiers. {SITE.name} n&apos;exerce aucun
            contrôle sur ces sites et décline toute responsabilité quant à leur contenu.
          </p>

          <h2>Droit applicable</h2>
          <p>
            Les présentes mentions légales sont soumises au droit ivoirien. En cas de litige,
            les tribunaux compétents d&apos;Abidjan seront seuls compétents.
          </p>
        </div>
      </section>
    </>
  );
}
