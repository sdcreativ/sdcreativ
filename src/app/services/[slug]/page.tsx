import { notFound } from "next/navigation";
import { ServiceDetailView } from "@/components/services/ServiceDetailView";
import { getServiceDetail, getServiceDetailSlugs } from "@/lib/public-services-resolver";
import { getService } from "@/lib/services";
import { createMetadata } from "@/lib/metadata";

type Props = { params: Promise<{ slug: string }> };

/**
 * Les fiches lisent le CMS + site public (`connection()`), donc le rendu doit être
 * dynamique — sinon Next lève DYNAMIC_SERVER_USAGE (500 en production).
 */
export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const slugs = await getServiceDetailSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const service = await getService(slug);
  const detail = await getServiceDetail(slug);
  if (!service || !detail) return {};

  return createMetadata({
    title: service.title,
    description: detail.metaDescription,
    path: `/services/${slug}`,
  });
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const service = await getService(slug);
  const detail = await getServiceDetail(slug);

  if (!service || !detail) notFound();

  return <ServiceDetailView service={service} detail={detail} />;
}
