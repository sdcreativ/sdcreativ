import { NextResponse } from "next/server";
import { getAvailabilityLabel, getExperienceLabel } from "@/content/carrieres";
import { getJobLabel, getJobSelectOptions } from "@/lib/public-careers-resolver";
import { htmlRow, sendEmail } from "@/lib/email";
import { rejectIfBot } from "@/lib/form-guard";
import { carriereSchema } from "@/lib/validations/carriere";

const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Trop de candidatures. Réessayez dans une heure." },
        { status: 429 },
      );
    }

    const body = await request.json();

    const rejected = await rejectIfBot(body);
    if (rejected) return rejected;

    const parsed = carriereSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides" },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const validJobIds = (await getJobSelectOptions()).map((o) => o.value);
    if (!validJobIds.includes(data.jobId)) {
      return NextResponse.json({ error: "Poste invalide." }, { status: 400 });
    }

    const sent = await sendEmail({
      replyTo: data.email,
      subject: `[SD CREATIV] Candidature — ${await getJobLabel(data.jobId)} — ${data.name}`,
      html: `
        <h2>Nouvelle candidature</h2>
        ${htmlRow("Poste", await getJobLabel(data.jobId))}
        ${htmlRow("Nom", data.name)}
        ${htmlRow("Email", data.email)}
        ${htmlRow("Téléphone", data.phone)}
        ${htmlRow("Ville / zone", data.city)}
        ${htmlRow("Expérience commerciale", getExperienceLabel(data.experience))}
        ${htmlRow("Disponibilité", getAvailabilityLabel(data.availability))}
        ${htmlRow("Permis B / véhicule", data.hasVehicle === "oui" ? "Oui" : "Non")}
        ${htmlRow("LinkedIn", data.linkedin || undefined)}
        ${htmlRow("Lien CV", data.cvLink || undefined)}
        <p><strong>Motivation :</strong></p>
        <p>${data.motivation.replace(/\n/g, "<br>")}</p>
      `,
    });

    if (!sent) {
      return NextResponse.json(
        { error: "Impossible d'envoyer la candidature. Réessayez plus tard." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Une erreur interne est survenue." },
      { status: 500 },
    );
  }
}
