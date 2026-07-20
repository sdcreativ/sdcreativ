/**
 * Pour l’instant, les notifications calendrier (rappels + invitations équipe)
 * partent sur l’email personnel plutôt que l’email professionnel CRM.
 */
export function resolveCalendarNotifyEmail(input: {
  professionalEmail: string;
  personalEmail?: string | null;
}): string {
  const personal = input.personalEmail?.trim().toLowerCase() || null;
  if (personal && personal.includes("@")) return personal;
  return input.professionalEmail.trim().toLowerCase();
}
