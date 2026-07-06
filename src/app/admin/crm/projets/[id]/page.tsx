import { Suspense } from "react";
import { ProjectDetailPage } from "@/components/admin/ProjectDetailPage";
import { Loader2 } from "lucide-react";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CrmProjectDetailRoute({ params }: Props) {
  const { id } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-gray-text">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          Chargement…
        </div>
      }
    >
      <ProjectDetailPage projectId={id} />
    </Suspense>
  );
}
