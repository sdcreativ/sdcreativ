import { isDatabaseConfigured } from "@/lib/db";
import { verifyCalendarRsvpToken } from "@/lib/calendar-rsvp-token";
import { RsvpResponsePanel } from "@/components/calendar/RsvpResponsePanel";

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ status?: string }>;
};

export default async function RsvpPage({ params, searchParams }: Props) {
  const { token: rawToken } = await params;
  const { status: rawStatus } = await searchParams;
  const token = decodeURIComponent(rawToken);
  const initialStatus =
    rawStatus === "accepted" || rawStatus === "declined" || rawStatus === "tentative"
      ? rawStatus
      : null;

  if (!isDatabaseConfigured()) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm text-gray-600">Service temporairement indisponible.</p>
      </main>
    );
  }

  if (!verifyCalendarRsvpToken(token)) {
    return (
      <main className="min-h-screen bg-[#eef2f7] px-4 py-12">
        <div className="mx-auto max-w-lg rounded-2xl border border-gray/40 bg-white p-6 text-center shadow-sm md:p-8">
          <h1 className="text-xl font-bold text-foreground">Lien invalide ou expiré</h1>
          <p className="mt-3 text-sm text-gray-600">
            Demandez à l’organisateur de renvoyer l’invitation.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#eef2f7] px-4 py-12">
      <div className="mx-auto max-w-lg rounded-2xl border border-gray/40 bg-white p-6 shadow-sm md:p-8">
        <RsvpResponsePanel token={token} initialStatus={initialStatus} />
      </div>
    </main>
  );
}
