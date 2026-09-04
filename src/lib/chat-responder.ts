import {
  chatFallback,
  chatFallbackEn,
  chatKnowledge,
  chatKnowledgeEn,
  type ChatKnowledgeEntry,
} from "@/content/chat-knowledge";
import { KADY_SYSTEM_EN, KADY_SYSTEM_FR, kadyAvailabilityHint } from "@/content/kady-profile";
import {
  attachChatActionLinks,
  sanitizeGhostChatCopy,
  stripInternalChatPaths,
} from "@/lib/chat-actions";
import {
  isAdvisorChatAvailable,
  type AiCommsMode,
} from "@/lib/threecx/ai-coexistence";

export type ChatLink = { label: string; href: string };
export type ChatLocale = "fr" | "en";
export type ChatTurn = { role: "user" | "assistant"; content: string };

export type ChatResponse = {
  answer: string;
  links?: ChatLink[];
  source: "knowledge" | "llm" | "fallback";
  openThreeCxLabel?: string;
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

const SYSTEM_PROMPT_FR = KADY_SYSTEM_FR;
const SYSTEM_PROMPT_EN = KADY_SYSTEM_EN;

function advisorChatLabel(locale: ChatLocale): string {
  return locale === "en" ? "Open advisor chat" : "Ouvrir le chat conseiller";
}

function shouldOfferAdvisorChat(
  mode: AiCommsMode,
  userMessage: string,
  answer: string,
): boolean {
  if (!isAdvisorChatAvailable(mode)) return false;
  const user = normalize(userMessage);
  const haystack = normalize(`${userMessage}\n${answer}`);
  if (user === "oui" || user === "yes" || user === "ok") return true;
  return (
    haystack.includes("conseiller") ||
    haystack.includes("humain") ||
    haystack.includes("live chat") ||
    haystack.includes("devis") ||
    haystack.includes("quote") ||
    haystack.includes("advisor")
  );
}

export async function respondWithLlm(
  message: string,
  locale: ChatLocale = "fr",
  history: ChatTurn[] = [],
  mode: AiCommsMode = "default",
): Promise<ChatResponse | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const knowledge = locale === "en" ? chatKnowledgeEn : chatKnowledge;
  const systemPrompt = `${locale === "en" ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_FR}\n\n${kadyAvailabilityHint(mode, locale)}`;
  const context = knowledge.map((e) => `[${e.id}] ${e.answer}`).join("\n");
  const advisorVisible = isAdvisorChatAvailable(mode);
  const prior = history
    .filter((turn) => turn.content.trim())
    .slice(-10)
    .map((turn) => ({
      role: turn.role,
      content:
        turn.role === "assistant"
          ? sanitizeGhostChatCopy(turn.content.slice(0, 500), advisorVisible)
          : turn.content.slice(0, 500),
    }));

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.25,
        max_tokens: 300,
        messages: [
          {
            role: "system",
            content: `${systemPrompt}\n\nKnowledge base:\n${context}`,
          },
          ...prior,
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

    const answer = sanitizeGhostChatCopy(
      stripInternalChatPaths(content),
      advisorVisible,
    );
    return {
      answer,
      links: attachChatActionLinks(message, `${content}\n${answer}`, locale),
      source: "llm",
      openThreeCxLabel: shouldOfferAdvisorChat(mode, message, content)
        ? advisorChatLabel(locale)
        : undefined,
    };
  } catch {
    return null;
  }
}

export async function getChatResponse(
  message: string,
  locale: ChatLocale = "fr",
  history: ChatTurn[] = [],
  mode: AiCommsMode = "default",
): Promise<ChatResponse> {
  const llm = await respondWithLlm(message, locale, history, mode);
  if (llm) return llm;

  const knowledge = respondFromKnowledge(message, locale);
  return {
    ...knowledge,
    answer: sanitizeGhostChatCopy(
      knowledge.answer,
      isAdvisorChatAvailable(mode),
    ),
    openThreeCxLabel: shouldOfferAdvisorChat(
      mode,
      message,
      knowledge.answer,
    )
      ? advisorChatLabel(locale)
      : undefined,
  };
}
