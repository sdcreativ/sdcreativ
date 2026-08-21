import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin-auth";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { logCrmAudit } from "@/lib/crm-audit";
import {
  getBlogPostById,
  markBlogFacebookPublished,
} from "@/lib/blog-posts";
import { isDatabaseConfigured } from "@/lib/db";
import {
  buildBlogPublicUrl,
  getFacebookPageConnectionStatus,
  publishToFacebookPage,
  toAbsolutePublicMediaUrl,
} from "@/lib/facebook-page";

type Props = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  message: z.string().min(1).max(5000),
  force: z.boolean().optional(),
});

export async function POST(request: Request, { params }: Props) {
  const authError = await crmApiAuth.blog.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Message de publication invalide." }, { status: 400 });
    }

    const post = await getBlogPostById(id);
    if (!post || post.deletedAt) {
      return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
    }
    if (post.status !== "published") {
      return NextResponse.json(
        { error: "Publiez d’abord l’article sur le site (statut Publié)." },
        { status: 400 },
      );
    }

    const fbStatus = await getFacebookPageConnectionStatus();
    if (!fbStatus.connected) {
      return NextResponse.json(
        { error: "Connectez la Page Facebook dans Paramètres → Site public." },
        { status: 400 },
      );
    }

    if (post.facebookPostId && !parsed.data.force) {
      return NextResponse.json(
        {
          error: "Cet article a déjà été publié sur Facebook. Utilisez « Republier » pour forcer.",
          facebookPostId: post.facebookPostId,
          facebookPublishedAt: post.facebookPublishedAt,
        },
        { status: 409 },
      );
    }

    const linkUrl = buildBlogPublicUrl(post.slug);
    const imageUrl =
      toAbsolutePublicMediaUrl(post.coverImage) ||
      toAbsolutePublicMediaUrl(post.ogImage);

    const result = await publishToFacebookPage({
      message: parsed.data.message,
      linkUrl,
      imageUrl,
    });

    const updated = await markBlogFacebookPublished(id, result.postId);
    const session = await getAdminSession();
    await logCrmAudit({
      actor: {
        userId: session?.userId && session.userId !== "legacy" ? session.userId : null,
        name: session?.name ?? "Admin",
        email: session?.email ?? null,
      },
      action: parsed.data.force ? "blog.facebook.republish" : "blog.facebook.publish",
      entityType: "blog_post",
      entityId: id,
      summary: `Publication Facebook : ${post.title}`,
      metadata: {
        facebookPostId: result.postId,
        pageId: fbStatus.pageId,
        permalink: result.permalink,
      },
    });

    return NextResponse.json({
      post: updated,
      facebookPostId: result.postId,
      permalink: result.permalink,
    });
  } catch (error) {
    console.error("[api/admin/blog-posts/id/publish-facebook] POST", error);
    const message = error instanceof Error ? error.message : "Publication Facebook impossible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
