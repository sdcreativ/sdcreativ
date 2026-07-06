import { notFound } from "next/navigation";
import { ServiceDetailView } from "@/components/services/ServiceDetailView";
import { getServiceDetail, getServiceDetailSlugs } from "@/content/service-details";
import { getService } from "@/lib/services";
import { createMetadata } from "@/lib/metadata";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return getServiceDetailSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const service = getService(slug);
  const detail = getServiceDetail(slug);
  if (!service || !detail) return {};

  return createMetadata({
    title: service.title,
    description: detail.metaDescription,
    path: `/services/${slug}`,
  });
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const service = getService(slug);
  const detail = getServiceDetail(slug);

  if (!service || !detail) notFound();

  return <ServiceDetailView service={service} detail={detail} />;
}
