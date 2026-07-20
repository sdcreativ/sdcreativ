import { notFound } from "next/navigation";
import { CrmComingSoon } from "@/components/admin/CrmComingSoon";
import { crmNavItems } from "@/content/crm-nav";

/**
 * Filet de sécurité pour les entrées nav `ready: false` sans page dédiée.
 * Les modules prêts ont leur propre `page.tsx` — ils ne passent pas ici.
 */
const UNREADY_SECTION_COPY: Record<
  string,
  { title: string; description: string; badge?: string }
> = {};

type Props = {
  params: Promise<{ section: string }>;
};

export default async function CrmSectionPage({ params }: Props) {
  const { section } = await params;
  const navItem = crmNavItems.find((item) => item.href === `/admin/crm/${section}`);

  // Uniquement les routes nav explicitement non prêtes
  if (!navItem || navItem.ready) {
    notFound();
  }

  const copy = UNREADY_SECTION_COPY[section] ?? {
    title: navItem.label,
    description: "Module en cours de développement.",
  };

  return (
    <CrmComingSoon
      title={copy.title}
      description={copy.description}
      badge={copy.badge}
    />
  );
}
