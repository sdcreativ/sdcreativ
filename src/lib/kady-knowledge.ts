import { cache } from "react";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { chatKnowledge, chatKnowledgeEn, type ChatKnowledgeEntry } from "@/content/chat-knowledge";
import { isDatabaseConfigured, withDb } from "@/lib/db";

/**
 * Base de connaissances de Nari modifiable dans l'admin. Tant qu'aucune réponse n'est enregistrée pour une
 * langue, Nari utilise la base écrite dans le code (`chat-knowledge.ts`) — rien ne change avant l'import.
 */
export const KADY_KNOWLEDGE_TAG = "kady-knowledge";
export const KADY_KNOWLEDGE_LOCALES = ["fr", "en"] as const;
export type KadyKnowledgeLocale = (typeof KADY_KNOWLEDGE_LOCALES)[number];

export type KadyKnowledgeRecord = {
  id: string;
  locale: KadyKnowledgeLocale;
  title: string;
  keywords: string[];
  answer: string;
  links: Array<{ label: string; href: string }>;
  isActive: boolean;
  sortOrder: number;
  updatedAt: string;
};

const linkSchema = z.object({
  label: z.string().trim().min(1).max(40),
  href: z
    .string()
    .trim()
    .max(300)
    .refine((v) => (v.startsWith("/") && !v.startsWith("//")) || /^https:\/\//.test(v), "Lien : page du site (/…) ou https."),
});

export const kadyKnowledgeSchema = z.object({
  locale: z.enum(KADY_KNOWLEDGE_LOCALES),
  title: z.string().trim().min(2, "Donnez un titre (usage interne).").max(120),
  keywords: z
    .array(z.string().trim().min(2).max(60))
    .min(1, "Ajoutez au moins un mot-clé.")
    .max(40)
    .transform((list) => [...new Set(list.map((k) => k.toLowerCase()))]),
  answer: z.string().trim().min(20, "Réponse trop courte.").max(1200),
  links: z.array(linkSchema).max(3),
  isActive: z.boolean(),
});
export type KadyKnowledgeInput = z.infer<typeof kadyKnowledgeSchema>;

type Row = {
  id: string;
  locale: KadyKnowledgeLocale;
  title: string;
  keywords: string[];
  answer: string;
  links: Array<{ label: string; href: string }>;
  is_active: boolean;
  sort_order: number;
  updated_at: Date;
};

function mapRow(row: Row): KadyKnowledgeRecord {
  return {
    id: row.id,
    locale: row.locale,
    title: row.title,
    keywords: row.keywords,
    answer: row.answer,
    links: row.links ?? [],
    isActive: row.is_active,
    sortOrder: row.sort_order,
    updatedAt: row.updated_at.toISOString(),
  };
}

function codeKnowledge(locale: KadyKnowledgeLocale): ChatKnowledgeEntry[] {
  return locale === "en" ? chatKnowledgeEn : chatKnowledge;
}

async function loadActiveKnowledge(locale: KadyKnowledgeLocale): Promise<ChatKnowledgeEntry[]> {
  if (!isDatabaseConfigured()) return codeKnowledge(locale);
  try {
    return await withDb(async (query) => {
      const { rows: count } = await query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM kady_knowledge WHERE locale = $1`, [locale]);
      if (!count[0]?.n) return codeKnowledge(locale);
      const { rows } = await query<Row>(
        `SELECT * FROM kady_knowledge WHERE locale = $1 AND is_active = true ORDER BY sort_order, title`,
        [locale],
      );
      return rows.map((r) => ({ id: r.id, keywords: r.keywords, answer: r.answer, links: r.links?.length ? r.links : undefined }));
    });
  } catch (error) {
    console.error("[kady-knowledge] repli sur la base du code", error);
    return codeKnowledge(locale);
  }
}

/** Réponses actives utilisées par Nari — cache taggé, invalidé à chaque modification dans l'admin. */
export const getKadyKnowledge = cache(async (locale: KadyKnowledgeLocale): Promise<ChatKnowledgeEntry[]> => {
  return unstable_cache(() => loadActiveKnowledge(locale), ["kady-knowledge", locale], {
    tags: [KADY_KNOWLEDGE_TAG],
    revalidate: 300,
  })();
});

export async function listKadyKnowledge(locale: KadyKnowledgeLocale): Promise<{ entries: KadyKnowledgeRecord[]; usingCode: boolean }> {
  return withDb(async (query) => {
    const { rows } = await query<Row>(`SELECT * FROM kady_knowledge WHERE locale = $1 ORDER BY sort_order, title`, [locale]);
    return { entries: rows.map(mapRow), usingCode: rows.length === 0 };
  });
}

export async function createKadyKnowledge(input: KadyKnowledgeInput): Promise<KadyKnowledgeRecord> {
  // Première réponse ajoutée : la base d'origine est importée avant, sinon Nari ne connaîtrait plus qu'elle.
  await importKadyKnowledgeFromCode(input.locale);
  return withDb(async (query) => {
    const { rows } = await query<Row>(
      `INSERT INTO kady_knowledge (locale, title, keywords, answer, links, is_active, sort_order)
       VALUES ($1::varchar, $2, $3, $4, $5::jsonb, $6,
         (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM kady_knowledge WHERE locale = $1::varchar))
       RETURNING *`,
      [input.locale, input.title, input.keywords, input.answer, JSON.stringify(input.links), input.isActive],
    );
    return mapRow(rows[0]!);
  });
}

export async function updateKadyKnowledge(id: string, input: KadyKnowledgeInput): Promise<KadyKnowledgeRecord | null> {
  return withDb(async (query) => {
    const { rows } = await query<Row>(
      `UPDATE kady_knowledge SET locale = $2, title = $3, keywords = $4, answer = $5, links = $6::jsonb, is_active = $7, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, input.locale, input.title, input.keywords, input.answer, JSON.stringify(input.links), input.isActive],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  });
}

export async function deleteKadyKnowledge(id: string): Promise<boolean> {
  return withDb(async (query) => {
    const { rowCount } = await query(`DELETE FROM kady_knowledge WHERE id = $1`, [id]);
    return Boolean(rowCount);
  });
}

const CODE_TITLES: Record<string, string> = {
  kady: "Présentation de l'assistante",
  tarifs: "Tarifs et formules",
  delais: "Délais",
};

/** Copie la base du code dans l'admin (une seule fois par langue) pour pouvoir la modifier. */
export async function importKadyKnowledgeFromCode(locale: KadyKnowledgeLocale): Promise<number> {
  return withDb(async (query) => {
    const { rows } = await query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM kady_knowledge WHERE locale = $1`, [locale]);
    if (rows[0]?.n) return 0;
    const entries = codeKnowledge(locale);
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!;
      const title = CODE_TITLES[entry.id] ?? entry.id.charAt(0).toUpperCase() + entry.id.slice(1).replace(/[-_]/g, " ");
      await query(
        `INSERT INTO kady_knowledge (locale, title, keywords, answer, links, is_active, sort_order)
         VALUES ($1, $2, $3, $4, $5::jsonb, true, $6)`,
        [locale, title, entry.keywords.map((k) => k.toLowerCase()), entry.answer, JSON.stringify(entry.links ?? []), i],
      );
    }
    return entries.length;
  });
}
