import { withDb } from "@/lib/db";
import { hasCrmPermission } from "@/lib/crm-access";
import type { CrmPermission } from "@/lib/crm-permissions";
import { listInboxItems } from "@/lib/inbox";

/** Compteurs actionnables pour badges sidebar / mobile. */
export type CrmNavBadges = {
  leads: number;
  quotes: number;
  tasks: number;
  tickets: number;
  inbox: number;
};

const EMPTY: CrmNavBadges = {
  leads: 0,
  quotes: 0,
  tasks: 0,
  tickets: 0,
  inbox: 0,
};

export async function getCrmNavBadges(
  permissions: CrmPermission[],
  userId: string | null,
): Promise<CrmNavBadges> {
  const badges = { ...EMPTY };

  await withDb(async (query) => {
    if (hasCrmPermission(permissions, "leads.read")) {
      const { rows } = await query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM leads
         WHERE status IN ('new', 'contacted', 'quote_sent')`,
      );
      badges.leads = Number(rows[0]?.count ?? 0);
    }

    if (hasCrmPermission(permissions, "quotes.read")) {
      const { rows } = await query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM quotes
         WHERE status IN ('sent', 'viewed', 'follow_up', 'negotiation')`,
      );
      badges.quotes = Number(rows[0]?.count ?? 0);
    }

    if (hasCrmPermission(permissions, "tasks.read")) {
      const { rows } = await query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM tasks
         WHERE status IN ('todo', 'in_progress')`,
      );
      badges.tasks = Number(rows[0]?.count ?? 0);
    }

    if (hasCrmPermission(permissions, "tickets.read")) {
      const { rows } = await query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM support_tickets
         WHERE status IN ('open', 'in_progress', 'waiting_client')`,
      );
      badges.tickets = Number(rows[0]?.count ?? 0);
    }
  });

  if (userId && hasCrmPermission(permissions, "tickets.read")) {
    try {
      const items = await listInboxItems(userId, { unreadOnly: true }, 200);
      badges.inbox = items.length;
    } catch {
      badges.inbox = 0;
    }
  }

  return badges;
}

export function formatNavBadge(count: number): string {
  if (count <= 0) return "";
  return count > 99 ? "99+" : String(count);
}
