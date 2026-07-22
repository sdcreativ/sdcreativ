import { CrmDocumentationEditor } from "@/components/admin/CrmDocumentationEditor";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CrmDocumentationEditPage({ params }: Props) {
  const { id } = await params;
  const pageId = id === "nouveau" ? null : id;
  return <CrmDocumentationEditor pageId={pageId} />;
}
