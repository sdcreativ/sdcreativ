/** Types / labels journal invitations — safe côté client (pas de `pg` / db). */

export type InvitationLogChannel = "email" | "whatsapp";
export type InvitationLogStatus =
  | "sent"
  | "failed"
  | "delivered"
  | "bounced"
  | "complained";

export const INVITATION_LOG_STATUS_LABELS: Record<InvitationLogStatus, string> = {
  sent: "Envoyé",
  failed: "Échec",
  delivered: "Délivré",
  bounced: "Rebond",
  complained: "Plainte spam",
};

export type CalendarInvitationLog = {
  id: string;
  eventId: string;
  email: string;
  channel: InvitationLogChannel;
  status: InvitationLogStatus;
  error: string | null;
  providerMessageId: string | null;
  sentAt: string;
};
