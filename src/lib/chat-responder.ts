import {
  chatFallback,
  chatFallbackEn,
  chatKnowledge,
  chatKnowledgeEn,
  type ChatKnowledgeEntry,
} from "@/content/chat-knowledge";

export type ChatLink = { label: string; href: string };
export type ChatLocale = "fr" | "en";

export type ChatResponse = {
  answer: string;
  links?: ChatLink[];
  source: "knowledge" | "llm" | "fallback";
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function scoreEntry(message: string, entry: ChatKnowledgeEntry): number {
  const normalized = normalize(message);
  let score = 0;

  for (const keyword of entry.keywords) {
    const kw = normalize(keyword);
    if (normalized.includes(kw)) {
      score += kw.includes(" ") ? 3 : 1;
    }
  }

  return score;
}

export function respondFromKnowledge(
  message: string,
  locale: ChatLocale = "fr",
): ChatResponse {
  const knowledge = locale === "en" ? chatKnowledgeEn : chatKnowledge;
  let best: ChatKnowledgeEntry | null = null;
  let bestScore = 0;

  for (const entry of knowledge) {
    const score = scoreEntry(message, entry);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  if (best && bestScore > 0) {
    return {
      answer: best.answer,
      links: best.links,
      source: "knowledge",
    };
  }

  if (locale === "en") {
    return {
      answer: chatFallbackEn,
      links: [
        { label: "Contact", href: "/en/contact" },
        { label: "Online quote", href: "/en/devis" },
      ],
      source: "fallback",
    };
  }

  return {
    answer: chatFallback,
    links: [
      { label: "Contact", href: "/contact" },
      { label: "Devis en ligne", href: "/devis" },
    ],
    source: "fallback",
  };
}

const SYSTEM_PROMPT_FR = `Tu es l'assistant commercial de SD CREATIV, agence web à Abidjan (Côte d'Ivoire).
Réponds en français, de façon concise (2-4 phrases max).
Tarifs : toujours sur devis personnalisé gratuit (pas de montants publics). Orienter vers /tarifs, /devis ou /contact.
Délais moyens : 15-30 jours pour un site, 4-8 semaines pour IA/sur mesure.
Oriente vers /devis, /contact, /solutions-ia ou /maintenance quand pertinent.
Ne invente pas de tarifs ou délais non mentionnés.`;

const SYSTEM_PROMPT_EN = `You are the sales assistant for SD CREATIV, a web agency in Abidjan (Côte d'Ivoire).
Reply in English, concisely (2-4 sentences max).
Pricing: always a free custom quote (no public amounts). Point to /en/pricing, /en/devis or /en/contact.
Average timelines: 15-30 days for a website, 4-8 weeks for AI/custom work.
Suggest /en/devis, /en/contact, /en/solutions-ia or /en/maintenance when relevant.
Do not invent prices or timelines not mentioned.`;

export async function respondWithLlm(
  message: string,
  locale: ChatLocale = "fr",
): Promise<ChatResponse | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const knowledge = locale === "en" ? chatKnowledgeEn : chatKnowledge;
  const systemPrompt = locale === "en" ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_FR;
  const context = knowledge.map((e) => `[${e.id}] ${e.answer}`).join("\n");

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.4,
        max_tokens: 300,
        messages: [
          {
            role: "system",
            content: `${systemPrompt}\n\nKnowledge base:\n${context}`,
          },
          { role: "user", content: message },
        ],
      }),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    return { answer: content, source: "llm" };
  } catch {
    return null;
  }
}

export async function getChatResponse(
  message: string,
  locale: ChatLocale = "fr",
): Promise<ChatResponse> {
  const knowledge = respondFromKnowledge(message, locale);

  if (knowledge.source !== "fallback") {
    return knowledge;
  }

  const llm = await respondWithLlm(message, locale);
  return llm ?? knowledge;
}
