import { notFound } from "next/navigation";
import { FormationDetailView } from "@/components/formations/FormationDetailView";
import {
  getFormationCategory,
  getFormationCategorySlugs,
  getFormationsContent,
} from "@/lib/formations-resolver";
import { createMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = await getFormationCategorySlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const category = await getFormationCategory(slug);
  if (!category) return {};

  return createMetadata({
    title: category.title,
    description: category.detail.metaDescription,
    path: `/formations/${slug}`,
    image: category.image,
  });
}

export default async function FormationDetailPage({ params }: Props) {
  const { slug } = await params;
  const category = await getFormationCategory(slug);
  if (!category) notFound();

  const content = await getFormationsContent();
  const related = content.categories.filter((c) => c.id !== category.id).slice(0, 3);

  return <FormationDetailView category={category} related={related} />;
}
