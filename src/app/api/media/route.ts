import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import sharp from "sharp";
import {
  isPublicMediaS3Key,
  parseS3ObjectFromPublicUrl,
} from "@/lib/image-url";
import { snapMediaWidth } from "@/lib/media-image-loader";
import { isS3Configured } from "@/lib/s3";

export const runtime = "nodejs";

const MAX_INPUT_BYTES = 8 * 1024 * 1024;

function parseQuality(raw: string | null): number {
  const value = Number.parseInt(raw ?? "75", 10);
  if (!Number.isFinite(value)) return 75;
  return Math.min(90, Math.max(40, value));
}

function isSvg(contentType: string | undefined, key: string): boolean {
  return Boolean(
    contentType?.includes("svg") || key.toLowerCase().endsWith(".svg"),
  );
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const rawUrl = requestUrl.searchParams.get("url");
  const widthParam = requestUrl.searchParams.get("w");
  const quality = parseQuality(requestUrl.searchParams.get("q"));

  if (!rawUrl) {
    return NextResponse.json({ error: "URL manquante." }, { status: 400 });
  }

  if (rawUrl.startsWith("/") && !rawUrl.startsWith("//")) {
    return NextResponse.redirect(new URL(rawUrl, request.url));
  }

  if (!isS3Configured()) {
    return NextResponse.json({ error: "Stockage S3 non configuré." }, { status: 503 });
  }

  const ref = parseS3ObjectFromPublicUrl(rawUrl);
  if (!ref?.bucket || !ref.key || !isPublicMediaS3Key(ref.key)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const region = ref.region || process.env.AWS_REGION;
  if (!region) {
    return NextResponse.json({ error: "Région S3 inconnue." }, { status: 503 });
  }

  try {
    const client = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const response = await client.send(
      new GetObjectCommand({
        Bucket: ref.bucket,
        Key: ref.key,
      }),
    );

    if (!response.Body) {
      return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
    }

    const contentType = response.ContentType ?? "application/octet-stream";
    const cacheHeaders = {
      "Cache-Control": "public, max-age=31536000, immutable",
    };

    if (isSvg(contentType, ref.key) || !widthParam) {
      return new NextResponse(response.Body.transformToWebStream(), {
        headers: {
          "Content-Type": contentType,
          ...cacheHeaders,
        },
      });
    }

    const bytes = await response.Body.transformToByteArray();
    if (bytes.byteLength > MAX_INPUT_BYTES) {
      return new NextResponse(Buffer.from(bytes), {
        headers: {
          "Content-Type": contentType,
          ...cacheHeaders,
        },
      });
    }

    try {
      const width = snapMediaWidth(Number.parseInt(widthParam, 10) || 640);
      const webp = await sharp(bytes)
        .rotate()
        .resize({
          width,
          withoutEnlargement: true,
        })
        .webp({ quality })
        .toBuffer();

      return new NextResponse(webp, {
        headers: {
          "Content-Type": "image/webp",
          ...cacheHeaders,
        },
      });
    } catch {
      return new NextResponse(Buffer.from(bytes), {
        headers: {
          "Content-Type": contentType,
          ...cacheHeaders,
        },
      });
    }
  } catch (error) {
    console.error("[api/media]", {
      bucket: ref.bucket,
      key: ref.key,
      region,
      error,
    });
    return NextResponse.json({ error: "Impossible de charger l'image." }, { status: 404 });
  }
}
