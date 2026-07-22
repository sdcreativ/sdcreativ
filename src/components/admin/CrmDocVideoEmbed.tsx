"use client";

import { toCrmDocVideoEmbedUrl } from "@/lib/crm-docs-video";

type Props = {
  videoUrl: string | null | undefined;
  title: string;
};

export function CrmDocVideoEmbed({ videoUrl, title }: Props) {
  const embed = toCrmDocVideoEmbedUrl(videoUrl);
  if (!embed) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-gray/30 bg-black/5">
      <div className="relative aspect-video w-full">
        <iframe
          src={embed}
          title={`Vidéo — ${title}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    </div>
  );
}
