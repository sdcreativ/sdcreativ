import {
  chatFallback,
  chatKnowledge,
  type ChatKnowledgeEntry,
} from "@/content/chat-knowledge";

export type ChatLink = { label: string; href: string };

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

export function respondFromKnowledge(message: string): ChatResponse {
  let best: ChatKnowledgeEntry | null = null;
  let bestScore = 0;

  for (const entry of chatKnowledge) {
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

  return {
    answer: chatFallback,
    links: [
      { label: "Contact", href: "/contact" },
      { label: "Devis en ligne", href: "/devis" },
    ],
    source: "fallback",
  };
}

const SYSTEM_PROMPT = `Tu es l'assistant commercial de SD CREATIV, agence web à Abidjan (Côte d'Ivoire).
Réponds en français, de façon concise (2-4 phrases max).
Tarifs indicatifs HT en FCFA : Essentiel 350k, Professionnel 850k, Business 1,8M, Agents IA 800k, Maintenance annuelle 480k.
Délais moyens : 15-30 jours pour un site, 4-8 semaines pour IA/sur mesure.
Oriente vers /devis, /contact, /solutions-ia ou /maintenance quand pertinent.
Ne invente pas de tarifs ou délais non mentionnés.`;

export async function respondWithLlm(message: string): Promise<ChatResponse | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const context = chatKnowledge
    .map((e) => `[${e.id}] ${e.answer}`)
    .join("\n");

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
            content: `${SYSTEM_PROMPT}\n\nBase de connaissances :\n${context}`,
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

export async function getChatResponse(message: string): Promise<ChatResponse> {
  const knowledge = respondFromKnowledge(message);

  if (knowledge.source !== "fallback") {
    return knowledge;
  }

  const llm = await respondWithLlm(message);
  return llm ?? knowledge;
}
