"use client";

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import Link from "next/link";
import {
  Bot,
  Headphones,
  HelpCircle,
  Loader2,
  MessageCircle,
  MessagesSquare,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { chatSuggestions, chatSuggestionsEn } from "@/content/chat-knowledge";
import { HoneypotField } from "@/components/forms/HoneypotField";
import { ChatContactCard } from "@/components/chat/ChatContactCard";
import { ChatNextSteps } from "@/components/chat/ChatNextSteps";
import { ChatBookingOverlay, buildChatBookingUrl } from "@/components/chat/ChatBookingOverlay";
import { useWhatsappUrl } from "@/components/site/SitePublicProvider";
import { getStoredAttribution } from "@/lib/attribution-client";
import { resolveImageDisplayUrl } from "@/lib/image-url";
import {
  DEFAULT_KADY_APPEARANCE,
  KADY_FONT_STACKS,
  type KadyAppearance,
  type KadyLauncherIcon,
  withAssistantName,
} from "@/lib/kady-appearance";
import {
  getAiGreeting,
  requestOpenThreeCxChat,
  type AiCommsMode,
} from "@/lib/threecx/ai-coexistence";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  links?: { label: string; href: string }[];
  openThreeCxLabel?: string;
  /** Réponse enregistrée : permet l'avis 👍 / 👎. */
  messageId?: string;
  rating?: 1 | -1;
};

type Props = {
  /** Phase 7 — message d’accueil contextualisé (handoff / hors horaires). */
  mode?: AiCommsMode;
  locale?: "fr" | "en";
  /** Apparence réglée dans CRM → Site → Nari. */
  appearance?: KadyAppearance;
  /** Côté effectif (forcé à gauche quand le Live Chat 3CX occupe la droite). */
  side?: "left" | "right";
  /**
   * Aperçu admin : positionné dans son conteneur (pas sur la page), ouvert d'office, messages d'exemple,
   * aucun envoi réel.
   */
  preview?: { open: boolean; messages: Array<{ role: "user" | "assistant"; content: string }> };
};

const CONVERSATION_KEY = "sdcreativ-kady-conversation";
const CONTACT_SENT_KEY = "sdcreativ-kady-contact-sent";
const CONTACT_INFO_KEY = "sdcreativ-kady-contact";

/** Prénom et e-mail donnés dans le chat (session) : pré-remplissent la réservation. */
function readContactInfo(): { name?: string; email?: string } {
  try {
    return JSON.parse(sessionStorage.getItem(CONTACT_INFO_KEY) ?? "{}") as { name?: string; email?: string };
  } catch {
    return {};
  }
}

/** Identifiant de conversation tiré au hasard, propre à l'onglet (sessionStorage) — aucun suivi d'un jour à l'autre. */
function sessionConversationId(): string {
  try {
    const existing = sessionStorage.getItem(CONVERSATION_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(CONVERSATION_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function readContactSent(): boolean {
  try {
    return sessionStorage.getItem(CONTACT_SENT_KEY) === "1";
  } catch {
    return false;
  }
}

const LAUNCHER_ICONS: Record<KadyLauncherIcon, LucideIcon> = {
  "message-circle": MessageCircle,
  "messages-square": MessagesSquare,
  bot: Bot,
  sparkles: Sparkles,
  headphones: Headphones,
  "help-circle": HelpCircle,
};

const PANEL_VARIANTS: Record<KadyAppearance["panelAnimation"], Variants> = {
  "slide-up": { hidden: { opacity: 0, y: 24 }, shown: { opacity: 1, y: 0 } },
  fade: { hidden: { opacity: 0 }, shown: { opacity: 1 } },
  scale: { hidden: { opacity: 0, scale: 0.85 }, shown: { opacity: 1, scale: 1 } },
  none: { hidden: { opacity: 1 }, shown: { opacity: 1 } },
};

export function ChatWidget({
  mode = "default",
  locale = "fr",
  appearance = DEFAULT_KADY_APPEARANCE,
  side,
  preview,
}: Props) {
  const isEn = locale === "en";
  const a = appearance;
  const name = a.name;
  const role = isEn ? a.roleEn : a.roleFr;
  const assistant = { name, greeting: isEn ? a.greetingEn : a.greetingFr };
  const position = side ?? a.position;
  const avatarSrc = resolveImageDisplayUrl(a.avatarUrl);
  const LauncherIcon = LAUNCHER_ICONS[a.launcherIcon];
  const [openState, setOpen] = useState(false);
  const open = preview ? preview.open : openState;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [conversationId] = useState(() => (typeof window === "undefined" ? "" : sessionConversationId()));
  /** Carte affichée dans la conversation : suites possibles, ou formulaire de rappel. */
  const [panel, setPanel] = useState<"choices" | "contact" | null>(null);
  const [bookingSrc, setBookingSrc] = useState<string | null>(null);
  const [contactSent, setContactSent] = useState(() => (typeof window === "undefined" ? false : readContactSent()));
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const modeRef = useRef(mode);

  useEffect(() => {
    if (modeRef.current !== mode) {
      modeRef.current = mode;
      if (open) {
        const greeting = getAiGreeting(mode, isEn ? "en" : "fr", assistant);
        setMessages((prev) => {
          if (prev.some((msg) => msg.role === "user")) return prev;
          return [
            {
              id: "welcome",
              role: "assistant",
              content: greeting.content,
              links: greeting.links,
              openThreeCxLabel: greeting.openThreeCxLabel,
            },
          ];
        });
        setInitialized(true);
      } else {
        setInitialized(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- accueil recalculé au changement de mode uniquement
  }, [mode, open, isEn]);

  useEffect(() => {
    if (open && !initialized) {
      const greeting = getAiGreeting(mode, isEn ? "en" : "fr", assistant);
      setMessages((prev) => {
        if (prev.length > 0) return prev;
        return [
          {
            id: "welcome",
            role: "assistant",
            content: greeting.content,
            links: greeting.links,
            openThreeCxLabel: greeting.openThreeCxLabel,
          },
        ];
      });
      setInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- accueil posé une fois à l'ouverture
  }, [open, initialized, mode, isEn]);

  useEffect(() => {
    if (open) {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      if (!preview) inputRef.current?.focus();
    }
  }, [open, messages, loading, preview, panel]);

  async function sendMessage(text: string, hp?: FormDataEntryValue | null) {
    const trimmed = text.trim();
    if (!trimmed || loading || preview) return;

    const history = messages.slice(-10).map((msg) => ({
      role: msg.role,
      content: msg.content.slice(0, 500),
    }));

    const userMsg: Message = {
      id: `user-${crypto.randomUUID()}`,
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          locale: isEn ? "en" : "fr",
          history,
          mode,
          conversationId: conversationId || undefined,
          pagePath: window.location.pathname,
          attribution: getStoredAttribution(),
          _hp: hp ?? "",
        }),
      });

      const data = (await res.json()) as {
        answer?: string;
        links?: { label: string; href: string }[];
        openThreeCxLabel?: string;
        offerContact?: boolean;
        messageId?: string;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Erreur");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${crypto.randomUUID()}`,
          role: "assistant",
          content: data.answer ?? (isEn ? "Sorry, something went wrong." : "Désolé, une erreur est survenue."),
          links: data.links,
          openThreeCxLabel: data.openThreeCxLabel,
          messageId: data.messageId,
        },
      ]);
      if (data.offerContact && !contactSent) setPanel("choices");
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${crypto.randomUUID()}`,
          role: "assistant",
          content: isEn
            ? "We cannot reply right now. Contact us via WhatsApp or the contact form."
            : "Impossible de répondre pour le moment. Contactez-nous via WhatsApp ou le formulaire de contact.",
          links: [
            {
              label: isEn ? "Contact" : "Contact",
              href: isEn ? "/en/contact" : "/contact",
            },
          ],
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function rate(msg: Message, rating: 1 | -1) {
    if (!msg.messageId || msg.rating || !conversationId) return;
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, rating } : m)));
    void fetch("/api/chat/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, messageId: msg.messageId, rating }),
      keepalive: true,
    }).catch(() => undefined);
    // Réponse jugée inutile : un conseiller peut prendre le relais.
    if (rating === -1 && !contactSent) setPanel("choices");
  }

  function handleContactSent(firstName: string, email: string) {
    setContactSent(true);
    setPanel(null);
    try {
      sessionStorage.setItem(CONTACT_SENT_KEY, "1");
      sessionStorage.setItem(CONTACT_INFO_KEY, JSON.stringify({ name: firstName, email }));
    } catch {
      /* stockage indisponible : sans gravité */
    }
    setMessages((prev) => [
      ...prev,
      {
        id: `assistant-${crypto.randomUUID()}`,
        role: "assistant",
        content: isEn
          ? `Thank you ${firstName}! An advisor will get back to you on WhatsApp as soon as possible during business hours (Mon–Fri, 8am–6pm).`
          : `Merci ${firstName} ! Un conseiller vous recontacte sur WhatsApp dès que possible, aux heures ouvrées (lun–ven, 8h–18h).`,
      },
    ]);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const hp = new FormData(e.currentTarget).get("_hp");
    void sendMessage(input, hp);
  }

  const shownMessages: Message[] = preview
    ? preview.messages.map((msg, i) => ({ id: `preview-${i}`, ...msg }))
    : messages;

  // Résumé du besoin (questions du visiteur) : repris dans WhatsApp et dans la réservation.
  const visitorNeed = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" — ")
    .slice(0, 220);
  const ref = conversationId ? conversationId.slice(0, 8).toUpperCase() : "";
  const whatsappHref = useWhatsappUrl(
    isEn
      ? `Hello SD CREATIV, I'm coming from the website chat${ref ? ` (conv. ${ref})` : ""}.${visitorNeed ? ` My request: ${visitorNeed}` : ""}`
      : `Bonjour SD CREATIV, je viens du chat du site${ref ? ` (conv. ${ref})` : ""}.${visitorNeed ? ` Mon besoin : ${visitorNeed}` : ""}`,
  );
  const bookingUrl = conversationId
    ? buildChatBookingUrl({ conversationId, notes: visitorNeed, ...(typeof window === "undefined" ? {} : readContactInfo()) })
    : null;

  function openBooking() {
    if (preview) return;
    if (!bookingUrl) {
      window.location.href = isEn ? "/en/book" : "/rendez-vous";
      return;
    }
    setPanel(null);
    setBookingSrc(bookingUrl);
  }

  function recordWhatsapp() {
    if (preview || !conversationId) return;
    void fetch("/api/chat/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, kind: "whatsapp" }),
      keepalive: true,
    }).catch(() => undefined);
  }

  // Couleurs, police et taille portées par des variables CSS (une seule source pour tout le widget).
  const vars = {
    "--kady-accent": a.colors.accent,
    "--kady-accent-text": a.colors.accentText,
    "--kady-header-bg": a.colors.headerBg,
    "--kady-header-text": a.colors.headerText,
    "--kady-bot-bg": a.colors.botBubble,
    "--kady-bot-text": a.colors.botText,
    "--kady-panel-bg": a.colors.panelBg,
    "--kady-size": `${a.launcherSize}px`,
    fontFamily: KADY_FONT_STACKS[a.font],
  } as CSSProperties;

  const right = position === "right";
  // Site : collé à la page. Aperçu : dans son cadre.
  const anchor = preview
    ? cn("absolute bottom-4", right ? "right-4" : "left-4")
    : cn("fixed bottom-24 md:bottom-8", right ? "right-4 md:right-8" : "left-4 md:left-8");
  const panelAnchor = preview
    ? cn("absolute bottom-[calc(2rem_+_var(--kady-size))]", right ? "right-4" : "left-4")
    : cn(
        "fixed bottom-[calc(7rem_+_var(--kady-size))] md:bottom-[calc(3rem_+_var(--kady-size))]",
        right ? "right-4 md:right-8" : "left-4 md:left-8",
      );

  const toggleClassName = cn(
    anchor,
    "z-[55] flex h-[var(--kady-size)] min-w-[var(--kady-size)] items-center justify-center gap-2 rounded-full shadow-lg shadow-black/20 transition-all hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kady-accent)]",
    a.showNameOnLauncher && !open ? "px-3 sm:px-4" : "px-0",
    open
      ? "bg-[var(--kady-header-bg)] text-[var(--kady-header-text)]"
      : "bg-[var(--kady-accent)] text-[var(--kady-accent-text)]",
    !open && a.launcherAnimation !== "none" && `kady-anim-${a.launcherAnimation}`,
  );

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            variants={PANEL_VARIANTS[a.panelAnimation]}
            initial={preview ? false : "hidden"}
            animate="shown"
            exit="hidden"
            transition={{ duration: a.panelAnimation === "none" ? 0 : 0.22 }}
            style={{ ...vars, fontSize: `${a.fontSize}px` }}
            className={cn(
              panelAnchor,
              "z-[55] flex w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-gray/40 bg-[var(--kady-panel-bg)] shadow-2xl shadow-black/15",
              preview ? "h-[min(460px,calc(100%-7rem))]" : "h-[min(520px,calc(100vh-10rem))]",
            )}
            id={preview ? undefined : "chat-widget-panel"}
            role="dialog"
            aria-label={`${name}, ${role}`}
          >
            <header className="flex items-center gap-3 bg-[var(--kady-header-bg)] px-4 py-3.5 text-[var(--kady-header-text)]">
              {/* eslint-disable-next-line @next/next/no-img-element -- photo importée (URL externe possible) */}
              <img
                src={avatarSrc}
                alt={isEn ? `${name}, SD CREATIV virtual assistant` : `${name}, assistance virtuelle de SD CREATIV`}
                width={36}
                height={36}
                className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-white/20"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[1em] font-bold">
                  {name}
                </p>
                <p className="flex items-center gap-1.5 text-[0.85em] opacity-70">
                  {mode === "handoff" ? (
                    <>
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden />
                      {isEn ? "Advisor online" : "Conseiller en ligne"}
                    </>
                  ) : mode === "after_hours" ? (
                    isEn ? "After hours · Booking / WhatsApp" : "Hors horaires · RDV / WhatsApp"
                  ) : (
                    role
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 opacity-70 transition-colors hover:bg-white/10 hover:opacity-100"
                aria-label={isEn ? "Close chat" : "Fermer le chat"}
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {shownMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    msg.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[88%] rounded-2xl px-4 py-2.5 text-[1em] leading-relaxed",
                      msg.role === "user"
                        ? "bg-[var(--kady-accent)] text-[var(--kady-accent-text)]"
                        : "bg-[var(--kady-bot-bg)] text-[var(--kady-bot-text)]",
                    )}
                  >
                    <p className="whitespace-pre-wrap wrap-break-word">{msg.content}</p>
                    {(msg.openThreeCxLabel || (msg.links && msg.links.length > 0)) && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {msg.openThreeCxLabel ? (
                          <button
                            type="button"
                            onClick={() => {
                              requestOpenThreeCxChat();
                              setOpen(false);
                            }}
                            className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-primary-dark"
                          >
                            <Headphones className="h-3 w-3" aria-hidden />
                            {msg.openThreeCxLabel}
                          </button>
                        ) : null}
                        {msg.links?.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-primary shadow-sm hover:underline"
                            onClick={() => setOpen(false)}
                          >
                            {link.label} →
                          </Link>
                        ))}
                      </div>
                    )}
                    {msg.role === "assistant" && msg.messageId && !preview ? (
                      <div className="mt-1.5 flex items-center gap-1 text-[0.8em] opacity-70">
                        {msg.rating ? (
                          <span>{isEn ? "Thanks for your feedback" : "Merci pour votre avis"}</span>
                        ) : (
                          <>
                            <span>{isEn ? "Helpful?" : "Utile ?"}</span>
                            <button
                              type="button"
                              onClick={() => rate(msg, 1)}
                              className="rounded p-1 hover:bg-black/5"
                              aria-label={isEn ? "Helpful answer" : "Réponse utile"}
                            >
                              <ThumbsUp className="h-3.5 w-3.5" aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={() => rate(msg, -1)}
                              className="rounded p-1 hover:bg-black/5"
                              aria-label={isEn ? "Not helpful" : "Réponse pas utile"}
                            >
                              <ThumbsDown className="h-3.5 w-3.5" aria-hidden />
                            </button>
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}

              {panel === "choices" && !preview && conversationId ? (
                <ChatNextSteps
                  locale={isEn ? "en" : "fr"}
                  whatsappHref={whatsappHref}
                  canBook={Boolean(bookingUrl)}
                  onBook={openBooking}
                  onWhatsapp={recordWhatsapp}
                  onCallback={() => setPanel(contactSent ? null : "contact")}
                  onDismiss={() => setPanel(null)}
                />
              ) : null}

              {panel === "contact" && !preview && conversationId ? (
                <ChatContactCard
                  conversationId={conversationId}
                  locale={isEn ? "en" : "fr"}
                  onSent={handleContactSent}
                  onDismiss={() => setPanel(null)}
                />
              ) : null}

              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl bg-[var(--kady-bot-bg)] px-4 py-2.5 text-[1em] text-[var(--kady-bot-text)] opacity-80">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    {isEn ? "Thinking…" : "Réflexion…"}
                  </div>
                </div>
              )}

              {shownMessages.length === 1 && !loading && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {(isEn ? chatSuggestionsEn : chatSuggestions).map((s) => withAssistantName(s, name)).map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void sendMessage(suggestion)}
                      className="rounded-full border border-[var(--kady-accent)] px-3 py-1.5 text-[0.85em] font-medium text-[var(--kady-accent)] transition-colors hover:bg-[var(--kady-accent)] hover:text-[var(--kady-accent-text)]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray/40 bg-[var(--kady-panel-bg)] px-3 pt-2 text-[0.75em] leading-snug text-gray-text">
              {/* Aperçu admin : toujours montré (pas de lecture du stockage de session au rendu serveur). */}
              {(preview || !panel) && shownMessages.some((m) => m.role === "user") ? (
                <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-semibold text-[var(--kady-accent)]">
                  {bookingUrl || preview ? (
                    <button type="button" onClick={openBooking} className="hover:underline">
                      {isEn ? "Book a call" : "Prendre rendez-vous"}
                    </button>
                  ) : null}
                  <span aria-hidden>·</span>
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={recordWhatsapp}
                    data-track-cta="chat_whatsapp"
                    className="hover:underline"
                  >
                    WhatsApp
                  </a>
                  {preview || !contactSent ? (
                    <>
                      <span aria-hidden>·</span>
                      <button type="button" onClick={() => setPanel("contact")} className="hover:underline">
                        {isEn ? "Get a call back" : "Être rappelé"}
                      </button>
                    </>
                  ) : null}
                </div>
              ) : null}
              <p>
                {isEn
                  ? "Messages are kept 90 days so our team can follow up. "
                  : "Échanges conservés 90 jours pour que l'équipe puisse vous répondre. "}
                <Link href={isEn ? "/en/privacy" : "/politique-confidentialite"} className="underline">
                  {isEn ? "Privacy" : "Confidentialité"}
                </Link>
              </p>
            </div>
            <form
              onSubmit={handleSubmit}
              className="relative flex gap-2 bg-[var(--kady-panel-bg)] p-3 pt-2"
            >
              <HoneypotField />
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isEn ? "Your question…" : "Votre question…"}
                maxLength={500}
                disabled={loading}
                readOnly={Boolean(preview)}
                className="min-w-0 flex-1 rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-[1em] text-foreground focus:border-[var(--kady-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--kady-accent)]/20 disabled:opacity-60"
                aria-label={isEn ? "Your message" : "Votre message"}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--kady-accent)] text-[var(--kady-accent-text)] transition-opacity hover:opacity-90 disabled:opacity-50"
                aria-label={isEn ? "Send" : "Envoyer"}
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {open ? (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={toggleClassName}
          style={vars}
          aria-label={isEn ? `Close ${name}` : `Fermer ${name}`}
          aria-expanded="true"
        >
          <X className="h-6 w-6" aria-hidden />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={toggleClassName}
          style={vars}
          data-track-cta={preview ? undefined : "chat_open"}
          aria-label={isEn ? `Open chat with ${name}` : `Ouvrir le chat avec ${name}`}
          aria-expanded="false"
        >
          <span className="relative">
            {a.launcherStyle === "icon" ? (
              <LauncherIcon className="h-[calc(var(--kady-size)*0.45)] w-[calc(var(--kady-size)*0.45)]" aria-hidden />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- photo importée (URL externe possible)
              <img
                src={avatarSrc}
                alt=""
                width={40}
                height={40}
                className="h-[calc(var(--kady-size)*0.62)] w-[calc(var(--kady-size)*0.62)] rounded-full object-cover ring-2 ring-white/30"
              />
            )}
            {mode === "handoff" ? (
              <span
                className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--kady-accent)] bg-emerald-400"
                aria-hidden
              />
            ) : null}
          </span>
          {a.showNameOnLauncher ? <span className="hidden text-sm font-semibold sm:inline">{name}</span> : null}
        </button>
      )}
      {bookingSrc ? (
        <ChatBookingOverlay src={bookingSrc} locale={isEn ? "en" : "fr"} onClose={() => setBookingSrc(null)} />
      ) : null}
    </>
  );
}
