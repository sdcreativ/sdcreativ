import sharp from "sharp";

const DEFAULT_QUALITY = 80;

export function withWebpFilename(filename: string): string {
  const trimmed = filename.trim() || "image";
  if (/\.webp$/i.test(trimmed)) return trimmed;
  if (/\.(jpe?g|png|gif|bmp|tiff?)$/i.test(trimmed)) {
    return trimmed.replace(/\.[^.]+$/, ".webp");
  }
  return `${trimmed}.webp`;
}

export function isSvgImage(contentType: string, filename: string): boolean {
  return (
    contentType.includes("svg") || filename.toLowerCase().endsWith(".svg")
  );
}

/**
 * Convertit un raster (JPEG/PNG/GIF statique/WebP) en WebP.
 * Ignore SVG et GIF animés. `null` = garder l’original.
 */
export async function convertRasterToWebp(
  input: Buffer,
  options?: { quality?: number; maxWidth?: number },
): Promise<{ buffer: Buffer; contentType: "image/webp" } | null> {
  try {
    const meta = await sharp(input, { failOn: "none" }).metadata();
    if (meta.format === "svg") return null;
    if (meta.format === "gif" && (meta.pages ?? 1) > 1) return null;

    const quality = options?.quality ?? DEFAULT_QUALITY;
    let pipeline = sharp(input, { failOn: "none" }).rotate();
    if (options?.maxWidth) {
      pipeline = pipeline.resize({
        width: options.maxWidth,
        withoutEnlargement: true,
      });
    }

    const buffer = await pipeline.webp({ quality }).toBuffer();
    return { buffer, contentType: "image/webp" };
  } catch {
    return null;
  }
}

/** Prépare un fichier image pour stockage (S3 / disque). */
export async function prepareImageForStorage(
  input: Buffer,
  filename: string,
  contentType: string,
  options?: { quality?: number; maxWidth?: number },
): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
  if (isSvgImage(contentType, filename)) {
    return { buffer: input, filename, contentType };
  }

  const converted = await convertRasterToWebp(input, options);
  if (!converted) {
    return { buffer: input, filename, contentType };
  }

  return {
    buffer: converted.buffer,
    filename: withWebpFilename(filename),
    contentType: converted.contentType,
  };
}
