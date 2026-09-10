import { PageHero } from "@/components/ui/PageHero";
import { ProductsCatalog } from "@/components/sections/ProductsCatalog";
import { houseProductsEn } from "@/content/products";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Products",
  description:
    "SD CREATIV products: KODIVA, the AI-agent platform, and CaddyNote, simplified school management.",
  path: "/en/products",
  locale: "en",
});

export default function EnProductsPage() {
  return (
    <>
      <PageHero
        eyebrow="The SD CREATIV house"
        title="Our"
        highlight="products"
        description="Software we design and operate, separate from agency work. You open them, you use them. We help if you want."
        breadcrumb={[
          { label: "Home", href: "/en" },
          { label: "Products" },
        ]}
      />
      <ProductsCatalog
        products={houseProductsEn}
        moreTitle="Need something that is not a product yet?"
        moreDescription="Websites, e-commerce, automation, apps: the agency builds around your business."
        moreCta="See services"
        moreHref="/en/services"
      />
    </>
  );
}
