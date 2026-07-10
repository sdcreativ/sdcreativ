"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
};

export function PresentationCaptureImage({
  src,
  alt,
  className,
  priority = false,
}: Props) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      priority={priority}
      unoptimized
      sizes="100vw"
      className={cn("object-contain", className)}
    />
  );
}
