import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { uploadBlogImage } from "@/lib/blog-media";

export async function POST(request: Request) {
  const authError = await requireAdminAuth({ write: true });
  if (authError) return authError;

  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { url, storage } = await uploadBlogImage(buffer, file.name, file.type || "application/octet-stream");

    return NextResponse.json({ url, storage });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload impossible.";
    console.error("[api/admin/blog-posts/upload]", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
