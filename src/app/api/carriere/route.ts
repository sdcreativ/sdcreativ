import { NextResponse } from "next/server";
import { getAvailabilityLabel, getExperienceLabel } from "@/content/carrieres";
import { getJobLabel, getJobSelectOptions } from "@/lib/public-careers-resolver";
import { htmlRow, sendEmail } from "@/lib/email";
import { rejectIfBot } from "@/lib/form-guard";
import {
  PUBLIC_FORM_RATE_LIMIT,
  consumeRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/lib/rate-limit";
import { carriereSchema } from "@/lib/validations/carriere";


export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limited = consumeRateLimit("public-carriere", ip, PUBLIC_FORM_RATE_LIMIT);
    if (limited.limited) return rateLimitExceededResponse(limited.retryAfterSec);

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

    const jobLabel = await getJobLabel(data.jobId);

    if (process.env.DATABASE_URL) {
      try {
        const { createCareerApplication } = await import("@/lib/career-applications");
        await createCareerApplication({
          jobId: data.jobId,
          jobLabel,
          name: data.name,
          email: data.email,
          phone: data.phone,
          city: data.city,
          experience: data.experience,
          availability: data.availability,
          hasVehicle: data.hasVehicle,
          linkedin: data.linkedin,
          cvLink: data.cvLink,
          motivation: data.motivation,
        });
      } catch (dbError) {
        console.error("[api/carriere] persist application", dbError);
      }
    }

    const sent = await sendEmail({
      replyTo: data.email,
      subject: `[SD CREATIV] Candidature — ${jobLabel} — ${data.name}`,
      html: `
        <h2>Nouvelle candidature</h2>
        ${htmlRow("Poste", jobLabel)}
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
