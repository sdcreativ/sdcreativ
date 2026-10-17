import { isDatabaseConfigured, withDb } from "@/lib/db";
import { leadChannel, type Attribution } from "@/lib/attribution";
import type { ChatIntent } from "@/lib/chat-contact-intent";

/**
 * Conversations avec Nari, enregistrées pour l'équipe (CRM → Conversations Nari).
 * Ni IP ni identifiant persistant : l'identifiant est tiré au hasard par le widget pour la session.
 */
export const CHAT_RETENTION_DAYS = 90;

export type ChatConversationSummary = {
  id: string;
  locale: string;
  firstPage: string | null;
  lastPage: string | null;
  attribution: Attribution | null;
  acquisitionChannel: string | null;
  leadId: string | null;
  leadName: string | null;
  messageCount: number;
  intent: ChatIntent | null;
  firstQuestion: string | null;
  readAt: string | null;
  createdAt: string;
  lastMessageAt: string;
  /** Rendez-vous réservé depuis le chat (Cal.com) et date du rendez-vous. */
  bookedAt: string | null;
  bookingStart: string | null;
  /** Le visiteur a poursuivi sur WhatsApp depuis le chat. */
  whatsappClickedAt: string | null;
};

export type ChatMessageRecord = { id: string; role: "user" | "assistant"; content: string; createdAt: string };

type ConversationRow = {
  id: string;
  locale: string;
  first_page: string | null;
  last_page: string | null;
  attribution: Attribution | null;
  acquisition_channel: string | null;
  lead_id: string | null;
  lead_name?: string | null;
  message_count: number;
  intent: ChatIntent | null;
  first_question?: string | null;
  read_at: Date | null;
  created_at: Date;
  last_message_at: Date;
  contact_offered_at?: Date | null;
  booked_at?: Date | null;
  booking_start?: Date | null;
  whatsapp_clicked_at?: Date | null;
};

function mapConversation(row: ConversationRow): ChatConversationSummary {
  return {
    id: row.id,
    locale: row.locale,
    firstPage: row.first_page,
    lastPage: row.last_page,
    attribution: row.attribution,
    acquisitionChannel: row.acquisition_channel,
    leadId: row.lead_id,
    leadName: row.lead_name ?? null,
    messageCount: row.message_count,
    intent: row.intent,
    firstQuestion: row.first_question ?? null,
    readAt: row.read_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    lastMessageAt: row.last_message_at.toISOString(),
    bookedAt: row.booked_at?.toISOString() ?? null,
    bookingStart: row.booking_start?.toISOString() ?? null,
    whatsappClickedAt: row.whatsapp_clicked_at?.toISOString() ?? null,
  };
}

/** Référence courte d'une conversation (8 premiers caractères), citée dans le message WhatsApp. */
export function conversationRef(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

let lastPurgeAt = 0;

/** Purge des conversations de plus de 90 jours sans prospect — au plus une fois par heure et par instance. */
async function purgeOldConversations(query: Parameters<Parameters<typeof withDb>[0]>[0]): Promise<void> {
  if (Date.now() - lastPurgeAt < 3_600_000) return;
  lastPurgeAt = Date.now();
  await query(
    `DELETE FROM chat_conversations
     WHERE lead_id IS NULL AND last_message_at < NOW() - make_interval(days => $1)`,
    [CHAT_RETENTION_DAYS],
  );
}

/**
 * Enregistre un échange (question du visiteur + réponse de Nari). Crée la conversation au premier message.
 * Retourne l'état utile au widget : prospect déjà créé, proposition de contact déjà faite.
 */
export async function recordChatExchange(input: {
  conversationId: string;
  locale: string;
  pagePath: string | null;
  attribution: Attribution | null;
  userMessage: string;
  assistantMessage: string;
  /** Origine de la réponse : base de connaissances, IA, ou réponse par défaut (question non comprise). */
  answerSource?: "knowledge" | "llm" | "fallback";
  intent: ChatIntent | null;
}): Promise<{ hasLead: boolean; contactOffered: boolean; assistantMessageId: string } | null> {
  if (!isDatabaseConfigured()) return null;
  return withDb(async (query) => {
    const { rows } = await query<ConversationRow>(
      `INSERT INTO chat_conversations (id, locale, first_page, last_page, attribution, acquisition_channel, intent, message_count)
       VALUES ($1, $2, $3, $3, $4::jsonb, $5, $6, 2)
       ON CONFLICT (id) DO UPDATE SET
         last_page = COALESCE(EXCLUDED.last_page, chat_conversations.last_page),
         attribution = COALESCE(chat_conversations.attribution, EXCLUDED.attribution),
         acquisition_channel = COALESCE(chat_conversations.acquisition_channel, EXCLUDED.acquisition_channel),
         intent = COALESCE(EXCLUDED.intent, chat_conversations.intent),
         message_count = chat_conversations.message_count + 2,
         read_at = NULL,
         last_message_at = NOW()
       RETURNING *`,
      [
        input.conversationId,
        input.locale,
        input.pagePath?.slice(0, 300) ?? null,
        input.attribution ? JSON.stringify(input.attribution) : null,
        leadChannel(input.attribution),
        input.intent,
      ],
    );
    await query(`INSERT INTO chat_messages (conversation_id, role, content) VALUES ($1, 'user', $2)`, [
      input.conversationId,
      input.userMessage.slice(0, 2000),
    ]);
    const { rows: inserted } = await query<{ id: string }>(
      `INSERT INTO chat_messages (conversation_id, role, content, answer_source) VALUES ($1, 'assistant', $2, $3) RETURNING id::text`,
      [input.conversationId, input.assistantMessage.slice(0, 4000), input.answerSource ?? null],
    );
    await purgeOldConversations(query).catch((error) => console.error("[chat-conversations] purge", error));
    const row = rows[0]!;
    return {
      hasLead: Boolean(row.lead_id),
      contactOffered: Boolean(row.contact_offered_at),
      assistantMessageId: inserted[0]!.id,
    };
  });
}

export async function markContactOffered(conversationId: string): Promise<void> {
  if (!isDatabaseConfigured()) return;
  await withDb((query) =>
    query(`UPDATE chat_conversations SET contact_offered_at = COALESCE(contact_offered_at, NOW()) WHERE id = $1`, [
      conversationId,
    ]),
  );
}

export async function attachLeadToConversation(conversationId: string, leadId: string): Promise<void> {
  await withDb((query) =>
    query(`UPDATE chat_conversations SET lead_id = $2, read_at = NULL WHERE id = $1`, [conversationId, leadId]),
  );
}

export async function getConversationMessages(conversationId: string): Promise<ChatMessageRecord[]> {
  if (!isDatabaseConfigured()) return [];
  return withDb(async (query) => {
    const { rows } = await query<{ id: string; role: "user" | "assistant"; content: string; created_at: Date }>(
      `SELECT id::text, role, content, created_at FROM chat_messages WHERE conversation_id = $1 ORDER BY id`,
      [conversationId],
    );
    return rows.map((r) => ({ id: r.id, role: r.role, content: r.content, createdAt: r.created_at.toISOString() }));
  });
}

/** Questions du visiteur, pour le message du prospect et l'alerte e-mail. */
export function visitorTranscript(messages: ChatMessageRecord[], maxLength = 1500): string {
  const text = messages
    .filter((m) => m.role === "user")
    .map((m) => `— ${m.content}`)
    .join("\n");
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

export type ConversationFilter = "all" | "unread" | "lead" | "intent" | "next_step";

export async function listConversations(options: { filter?: ConversationFilter; limit?: number; ref?: string } = {}) {
  if (!isDatabaseConfigured()) return [];
  const conditions: string[] = [];
  const params: unknown[] = [Math.min(Math.max(options.limit ?? 100, 1), 300)];
  if (options.filter === "unread") conditions.push("c.read_at IS NULL");
  if (options.filter === "lead") conditions.push("c.lead_id IS NOT NULL");
  if (options.filter === "intent") conditions.push("c.intent IS NOT NULL");
  if (options.filter === "next_step") conditions.push("(c.booked_at IS NOT NULL OR c.whatsapp_clicked_at IS NOT NULL)");
  // Référence citée par le visiteur sur WhatsApp (ex. « conv. 3F2A9C1B »).
  const ref = options.ref?.trim().replace(/[^0-9a-f]/gi, "").toLowerCase();
  if (ref) {
    params.push(`${ref.slice(0, 8)}%`);
    conditions.push(`c.id::text LIKE $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return withDb(async (query) => {
    const { rows } = await query<ConversationRow>(
      `SELECT c.*, l.name AS lead_name,
         (SELECT m.content FROM chat_messages m WHERE m.conversation_id = c.id AND m.role = 'user' ORDER BY m.id LIMIT 1) AS first_question
       FROM chat_conversations c LEFT JOIN leads l ON l.id = c.lead_id
       ${where}
       ORDER BY c.last_message_at DESC
       LIMIT $1`,
      params,
    );
    return rows.map(mapConversation);
  });
}

export async function getConversation(id: string): Promise<ChatConversationSummary | null> {
  if (!isDatabaseConfigured()) return null;
  return withDb(async (query) => {
    const { rows } = await query<ConversationRow>(
      `SELECT c.*, l.name AS lead_name FROM chat_conversations c LEFT JOIN leads l ON l.id = c.lead_id WHERE c.id = $1`,
      [id],
    );
    return rows[0] ? mapConversation(rows[0]) : null;
  });
}

export async function markConversationRead(id: string): Promise<void> {
  await withDb((query) => query(`UPDATE chat_conversations SET read_at = NOW() WHERE id = $1 AND read_at IS NULL`, [id]));
}

/** Badge du menu : conversations à lire (30 derniers jours). */
export async function countUnreadConversations(query: Parameters<Parameters<typeof withDb>[0]>[0]): Promise<number> {
  const { rows } = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM chat_conversations
     WHERE read_at IS NULL AND last_message_at > NOW() - INTERVAL '30 days'`,
  );
  return Number(rows[0]?.count ?? 0);
}

/** Avis du visiteur sur une réponse de Nari (👍 = 1, 👎 = -1). Vérifie que le message appartient à la conversation. */
export async function rateAssistantMessage(conversationId: string, messageId: string, rating: 1 | -1): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  return withDb(async (query) => {
    const { rowCount } = await query(
      `UPDATE chat_messages SET rating = $3 WHERE id = $2::bigint AND conversation_id = $1 AND role = 'assistant'`,
      [conversationId, messageId, rating],
    );
    return Boolean(rowCount);
  });
}

export type QuestionToImprove = {
  /** Identifiant de la réponse de Nari (sert à marquer la question comme traitée). */
  messageId: string;
  conversationId: string;
  question: string;
  answer: string;
  reason: "fallback" | "thumbs_down";
  locale: string;
  createdAt: string;
};

/**
 * Questions mal traitées : Nari n'a rien trouvé (réponse par défaut) ou le visiteur a mis 👎.
 * Les plus récentes d'abord ; une question traitée dans l'admin disparaît de la liste.
 */
export async function listQuestionsToImprove(options: { sinceDays?: number; limit?: number } = {}): Promise<QuestionToImprove[]> {
  if (!isDatabaseConfigured()) return [];
  return withDb(async (query) => {
    const { rows } = await query<{
      id: string;
      conversation_id: string;
      answer: string;
      answer_source: string | null;
      rating: number | null;
      locale: string;
      created_at: Date;
      question: string | null;
    }>(
      `SELECT a.id::text, a.conversation_id, a.content AS answer, a.answer_source, a.rating, c.locale, a.created_at,
         (SELECT u.content FROM chat_messages u
           WHERE u.conversation_id = a.conversation_id AND u.role = 'user' AND u.id < a.id
           ORDER BY u.id DESC LIMIT 1) AS question
       FROM chat_messages a JOIN chat_conversations c ON c.id = a.conversation_id
       WHERE a.role = 'assistant' AND a.reviewed_at IS NULL
         AND (a.answer_source = 'fallback' OR a.rating = -1)
         AND a.created_at > NOW() - make_interval(days => $1)
       ORDER BY a.created_at DESC
       LIMIT $2`,
      [options.sinceDays ?? 90, Math.min(Math.max(options.limit ?? 100, 1), 300)],
    );
    return rows
      .filter((r) => r.question)
      .map((r) => ({
        messageId: r.id,
        conversationId: r.conversation_id,
        question: r.question!,
        answer: r.answer,
        reason: r.rating === -1 ? "thumbs_down" : "fallback",
        locale: r.locale,
        createdAt: r.created_at.toISOString(),
      }));
  });
}

export async function markQuestionReviewed(messageId: string): Promise<boolean> {
  return withDb(async (query) => {
    const { rowCount } = await query(
      `UPDATE chat_messages SET reviewed_at = NOW() WHERE id = $1::bigint AND role = 'assistant' AND reviewed_at IS NULL`,
      [messageId],
    );
    return Boolean(rowCount);
  });
}

export type KadyWeeklyStats = { conversations: number; leads: number; thumbsUp: number; thumbsDown: number };

export async function getKadyWeeklyStats(days = 7): Promise<KadyWeeklyStats> {
  return withDb(async (query) => {
    const { rows } = await query<KadyWeeklyStats>(
      `SELECT
         (SELECT COUNT(*)::int FROM chat_conversations WHERE created_at > NOW() - make_interval(days => $1)) AS conversations,
         (SELECT COUNT(*)::int FROM leads WHERE source = 'chat' AND created_at > NOW() - make_interval(days => $1)) AS leads,
         (SELECT COUNT(*)::int FROM chat_messages WHERE rating = 1 AND created_at > NOW() - make_interval(days => $1)) AS "thumbsUp",
         (SELECT COUNT(*)::int FROM chat_messages WHERE rating = -1 AND created_at > NOW() - make_interval(days => $1)) AS "thumbsDown"`,
      [days],
    );
    return rows[0]!;
  });
}

/** Rendez-vous réservé depuis le chat (webhook Cal.com). */
export async function markConversationBooked(conversationId: string, bookingStart: string | null): Promise<boolean> {
  return withDb(async (query) => {
    const { rowCount } = await query(
      `UPDATE chat_conversations SET booked_at = NOW(), booking_start = $2, read_at = NULL WHERE id = $1`,
      [conversationId, bookingStart],
    );
    return Boolean(rowCount);
  });
}

/** Passage sur WhatsApp depuis le chat (bouton « Continuer sur WhatsApp »). */
export async function markConversationWhatsapp(conversationId: string): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  return withDb(async (query) => {
    const { rowCount } = await query(
      `UPDATE chat_conversations SET whatsapp_clicked_at = COALESCE(whatsapp_clicked_at, NOW()), read_at = NULL WHERE id = $1`,
      [conversationId],
    );
    return Boolean(rowCount);
  });
}
