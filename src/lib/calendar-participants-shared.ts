/** Types / labels RSVP — safe côté client (pas de `pg` / db). */

export const RSVP_STATUSES = ["pending", "accepted", "declined", "tentative"] as const;
export type RsvpStatus = (typeof RSVP_STATUSES)[number];

export const RSVP_STATUS_LABELS: Record<RsvpStatus, string> = {
  pending: "En attente",
  accepted: "Accepté",
  declined: "Refusé",
  tentative: "Peut-être",
};

export type CalendarParticipant = {
  id: string;
  eventId: string;
  email: string;
  name: string | null;
  phone: string | null;
  status: RsvpStatus;
  invitedAt: string;
  respondedAt: string | null;
};

export type ParticipantInput = {
  email: string;
  name?: string | null;
  phone?: string | null;
};

export function summarizeRsvp(participants: Array<{ status: RsvpStatus }>): Record<RsvpStatus, number> {
  const summary: Record<RsvpStatus, number> = {
    pending: 0,
    accepted: 0,
    declined: 0,
    tentative: 0,
  };
  for (const p of participants) {
    summary[p.status] += 1;
  }
  return summary;
}
