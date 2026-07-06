import { CrmBlogEditor } from "@/components/admin/CrmBlogEditor";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CrmBlogEditPage({ params }: Props) {
  const { id } = await params;
  const postId = id === "nouveau" ? null : id;
  return <CrmBlogEditor postId={postId} />;
}
