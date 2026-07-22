import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import {
  isPublicMediaS3Key,
  parseS3ObjectFromPublicUrl,
} from "@/lib/image-url";
import { isS3Configured } from "@/lib/s3";

export async function GET(request: Request) {
  const rawUrl = new URL(request.url).searchParams.get("url");
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

    return new NextResponse(response.Body.transformToWebStream(), {
      headers: {
        "Content-Type": response.ContentType ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
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
