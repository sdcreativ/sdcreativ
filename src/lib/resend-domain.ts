/**
 * Vérifie le statut du domaine d’envoi Resend (CONTACT_FROM_EMAIL).
 * Retourne null si la clé API est absente ou si l’appel échoue sans info utile.
 */
export type ResendDomainStatus = {
  domain: string;
  status: "verified" | "pending" | "failed" | "not_started" | "unknown";
  rawStatus: string | null;
};

export async function fetchResendDomainStatus(): Promise<ResendDomainStatus | null> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.CONTACT_FROM_EMAIL?.trim() ?? "";
  if (!apiKey || !fromEmail.includes("@")) return null;

  const domain = fromEmail.split("@")[1]!.toLowerCase();

  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      console.error("[resend-domain] list domains HTTP", res.status);
      return { domain, status: "unknown", rawStatus: null };
    }

    const json = (await res.json()) as {
      data?: Array<{ name?: string; status?: string }>;
    };
    const rows = json.data ?? [];
    const match = rows.find((d) => (d.name ?? "").toLowerCase() === domain);
    if (!match) {
      return { domain, status: "not_started", rawStatus: null };
    }

    const raw = (match.status ?? "").toLowerCase();
    let status: ResendDomainStatus["status"] = "unknown";
    if (raw === "verified") status = "verified";
    else if (raw === "pending") status = "pending";
    else if (raw === "failed") status = "failed";
    else if (raw === "not_started") status = "not_started";

    return { domain, status, rawStatus: match.status ?? null };
  } catch (error) {
    console.error("[resend-domain] list domains", error);
    return { domain, status: "unknown", rawStatus: null };
  }
}
