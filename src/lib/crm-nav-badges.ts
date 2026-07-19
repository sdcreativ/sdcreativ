/** Compteurs actionnables pour badges sidebar / mobile (client-safe). */
export type CrmNavBadges = {
  leads: number;
  quotes: number;
  tasks: number;
  tickets: number;
  inbox: number;
};

export function formatNavBadge(count: number): string {
  if (count <= 0) return "";
  return count > 99 ? "99+" : String(count);
}
