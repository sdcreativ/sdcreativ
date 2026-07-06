import { NextResponse } from "next/server";
import {
  createBlogComment,
  createBlogCommentSchema,
  listApprovedBlogComments,
} from "@/lib/blog-comments";
import { isDatabaseConfigured } from "@/lib/db";

type Props = {
  params: Promise<{ slug: string }>;
};

function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

export async function GET(_request: Request, { params }: Props) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ comments: [] });
  }

  try {
    const { slug } = await params;
    const comments = await listApprovedBlogComments(slug);
    return NextResponse.json({
      comments: comments.map((comment) => ({
        id: comment.id,
        authorName: comment.authorName,
        content: comment.content,
        createdAt: comment.createdAt,
      })),
    });
  } catch {
    return NextResponse.json({ comments: [] });
  }
}

export async function POST(request: Request, { params }: Props) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Commentaires indisponibles." }, { status: 503 });
  }

  try {
    const { slug } = await params;
    const body = await request.json();
    const parsed = createBlogCommentSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    await createBlogComment(slug, parsed.data, clientIp(request));
    return NextResponse.json(
      { success: true, message: "Commentaire envoyé — il sera visible après modération." },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Envoi impossible.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
