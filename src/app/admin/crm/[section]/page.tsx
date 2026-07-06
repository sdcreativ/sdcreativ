import { notFound } from "next/navigation";
import { CrmComingSoon } from "@/components/admin/CrmComingSoon";
import { crmNavItems } from "@/content/crm-nav";

const sectionCopy: Record<string, { title: string; description: string }> = {};

type Props = {
  params: Promise<{ section: string }>;
};

export default async function CrmSectionPage({ params }: Props) {
  const { section } = await params;
  const navItem = crmNavItems.find((item) => item.href === `/admin/crm/${section}`);

  if (!navItem || navItem.ready) {
    notFound();
  }

  const copy = sectionCopy[section] ?? {
    title: navItem.label,
    description: "Module en cours de développement.",
  };

  return <CrmComingSoon title={copy.title} description={copy.description} />;
}
