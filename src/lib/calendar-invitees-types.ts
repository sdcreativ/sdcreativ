export type CalendarInvitee = {
  id: string;
  source: "team" | "client";
  name: string;
  email: string;
  phone: string | null;
  subtitle: string | null;
};

export function inviteeKey(invitee: Pick<CalendarInvitee, "source" | "id">): string {
  return `${invitee.source}:${invitee.id}`;
}
