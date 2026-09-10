import { PageHero } from "@/components/ui/PageHero";
import { ProductsCatalog } from "@/components/sections/ProductsCatalog";
import { houseProducts } from "@/content/products";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Produits",
  description:
    "Les produits SD CREATIV : KODIVA, la plateforme d’agents IA, et CaddyNote, la gestion scolaire simplifiée.",
  path: "/produits",
});

export default function ProduitsPage() {
  return (
    <>
      <PageHero
        eyebrow="Maison SD CREATIV"
        title="Nos"
        highlight="produits"
        description="Des logiciels que nous concevons et opérons, distincts des prestations d’agence. Vous les ouvrez, vous les utilisez. On vous accompagne si besoin."
        breadcrumb={[{ label: "Accueil", href: "/" }, { label: "Produits" }]}
      />
      <ProductsCatalog
        products={houseProducts}
        moreTitle="Un besoin qui n’est pas encore un produit ?"
        moreDescription="Sites, e-commerce, automatisation, applications : l’agence construit sur mesure autour de votre métier."
        moreCta="Voir les services"
        moreHref="/services"
      />
    </>
  );
}
