import { NextResponse } from "next/server";
import { z } from "zod";
import { incrementBlogStat } from "@/lib/blog-stats";
import { isDatabaseConfigured } from "@/lib/db";

const trackSchema = z.object({
  slug: z.string().trim().min(2).max(200),
  type: z.enum(["view", "click"]),
});

function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = trackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }

    void clientIp(request);
    const updated = await incrementBlogStat(parsed.data.slug, parsed.data.type);
    return NextResponse.json({ ok: updated });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
