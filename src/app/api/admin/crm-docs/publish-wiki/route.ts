import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { generateCrmWikiFiles, isCrmWikiPublishEnabled, publishCrmWiki } from "@/lib/crm-docs-wiki";

export async function POST(request: Request) {
  const authError = await crmApiAuth.docs.write();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const generateOnly = searchParams.get("generateOnly") === "1";

  try {
    if (generateOnly || !isCrmWikiPublishEnabled()) {
      const generated = await generateCrmWikiFiles();
      return NextResponse.json({
        ok: true,
        pushed: false,
        generateOnly: true,
        ...generated,
        hint: isCrmWikiPublishEnabled()
          ? undefined
          : "CRM_WIKI_PUBLISH_ENABLED=1 + CRM_WIKI_GIT_URL pour pousser sur GitHub Wiki.",
      });
    }

    const result = await publishCrmWiki();
    return NextResponse.json({
      ok: true,
      pushed: result.pushed,
      commitMessage: result.commitMessage,
      ...result.generated,
    });
  } catch (error) {
    console.error("[api/admin/crm-docs/publish-wiki]", error);
    const message = error instanceof Error ? error.message : "Publication impossible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
