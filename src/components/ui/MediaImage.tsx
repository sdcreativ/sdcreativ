import Image, { type ImageProps } from "next/image";
import { isProxiedMediaUrl } from "@/lib/image-url";
import { mediaImageLoader } from "@/lib/media-image-loader";

function isSvgSrc(src: string): boolean {
  return /\.svg(?:$|[?#])/i.test(src);
}

type Props = Omit<ImageProps, "loader">;

/** Image publique : `/_next/image` en local, resize Sharp via `/api/media` pour le S3. */
export function MediaImage({ src, unoptimized, ...props }: Props) {
  const srcStr = typeof src === "string" ? src : "";
  const proxied = Boolean(srcStr && isProxiedMediaUrl(srcStr));
  const svg = proxied && isSvgSrc(srcStr);

  return (
    <Image
      {...props}
      src={src}
      loader={proxied && !svg ? mediaImageLoader : undefined}
      unoptimized={unoptimized ?? svg}
    />
  );
}
