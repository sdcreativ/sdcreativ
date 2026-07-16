import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { isDatabaseConfigured, withDb } from "@/lib/db";

export type MailContactSuggestion = {
  email: string;
  name: string;
  source: "client" | "lead";
};

/** Autocomplétion destinataires (clients + leads). */
export async function GET(request: Request) {
  const authError = await requireAdminAuth({
    anyPermission: ["mail.read", "mail.write", "clients.read", "leads.read"],
  });
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ contacts: [] });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ contacts: [] as MailContactSuggestion[] });
  }

  const pattern = `%${q.replace(/[%_\\]/g, "\\$&")}%`;

  try {
    const contacts = await withDb(async (query) => {
      const results: MailContactSuggestion[] = [];
      const { rows: clients } = await query<{ name: string; email: string; company: string | null }>(
        `SELECT name, email, company FROM clients
         WHERE email ILIKE $1 OR name ILIKE $1 OR company ILIKE $1
         ORDER BY updated_at DESC LIMIT 12`,
        [pattern],
      );
      for (const row of clients) {
        if (!row.email?.includes("@")) continue;
        results.push({
          email: row.email.toLowerCase(),
          name: row.company?.trim() || row.name,
          source: "client",
        });
      }

      const { rows: leads } = await query<{ name: string; email: string; company: string | null }>(
        `SELECT name, email, company FROM leads
         WHERE email ILIKE $1 OR name ILIKE $1 OR company ILIKE $1
         ORDER BY updated_at DESC LIMIT 12`,
        [pattern],
      );
      for (const row of leads) {
        if (!row.email?.includes("@")) continue;
        const email = row.email.toLowerCase();
        if (results.some((c) => c.email === email)) continue;
        results.push({
          email,
          name: row.company?.trim() || row.name,
          source: "lead",
        });
      }

      return results.slice(0, 16);
    });

    return NextResponse.json({ contacts });
  } catch (error) {
    console.error("[api/admin/mail/contacts] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
