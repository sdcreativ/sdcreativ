import { notFound } from "next/navigation";
import { ServiceDetailView } from "@/components/services/ServiceDetailView";
import { getServiceDetailEn } from "@/content/service-details-en";
import { servicesEnById } from "@/i18n/public-en";
import { getServiceDetail, getServiceDetailSlugs } from "@/lib/public-services-resolver";
import { getService } from "@/lib/services";
import { createMetadata } from "@/lib/metadata";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await getServiceDetailSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const service = await getService(slug);
  const detailEn = getServiceDetailEn(slug);
  const enCard = servicesEnById[slug];
  if (!service && !detailEn && !enCard) return {};

  return createMetadata({
    title: enCard?.title ?? service?.title ?? "Service",
    description: detailEn?.metaDescription ?? enCard?.description ?? service?.description ?? "",
    path: `/en/services/${slug}`,
    locale: "en",
  });
}

export default async function EnServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const service = await getService(slug);
  const detailFr = await getServiceDetail(slug);
  const detailEn = getServiceDetailEn(slug);
  const enCard = servicesEnById[slug];

  if (!service || (!detailEn && !detailFr)) notFound();

  const detail = detailEn ?? detailFr!;
  const resolvedService = {
    ...service,
    title: enCard?.title ?? service.title,
    description: enCard?.description ?? service.description,
    features: enCard?.features ?? service.features,
    imageAlt: enCard?.imageAlt ?? service.imageAlt,
  };

  return <ServiceDetailView service={resolvedService} detail={detail} locale="en" />;
}
