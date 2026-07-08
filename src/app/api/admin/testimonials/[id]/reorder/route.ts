import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { reorderPublicTestimonial } from "@/lib/public-testimonials";
import { isDatabaseConfigured } from "@/lib/db";
import { revalidateTestimonialsPages } from "@/lib/site-revalidate";

type Props = { params: Promise<{ id: string }> };

const reorderSchema = z.object({ direction: z.enum(["up", "down"]) });

export async function POST(request: Request, { params }: Props) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = reorderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides." }, { status: 400 });
    }

    const testimonial = await reorderPublicTestimonial(id, parsed.data.direction);
    if (!testimonial) {
      return NextResponse.json({ error: "Témoignage introuvable." }, { status: 404 });
    }

    revalidateTestimonialsPages();
    return NextResponse.json({ testimonial });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Réordonnancement impossible.";
    console.error("[api/admin/testimonials/id/reorder] POST", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
