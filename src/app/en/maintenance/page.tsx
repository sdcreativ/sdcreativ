import { PageHero } from "@/components/ui/PageHero";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Maintenance & support",
  description: "Website maintenance plans and ongoing support for your digital assets.",
  path: "/en/maintenance",
  locale: "en",
});

export default function EnMaintenancePage() {
  return (
    <>
      <PageHero
        eyebrow="Maintenance"
        title="Keep your site fast, secure and up to date"
        description="Monthly maintenance plans tailored to your stack."
        breadcrumb={[{ label: "Home", href: "/en" }, { label: "Maintenance" }]}
      />
      <section className="container mx-auto max-w-3xl px-4 py-16 text-gray-text">
        <p>
          Our maintenance packages include updates, monitoring, backups and priority support.
          Contact us for a quote aligned with your infrastructure.
        </p>
      </section>
    </>
  );
}
