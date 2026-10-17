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
  X,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { chatSuggestions, chatSuggestionsEn } from "@/content/chat-knowledge";
import { HoneypotField } from "@/components/forms/HoneypotField";
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
};

type Props = {
  /** Phase 7 — message d’accueil contextualisé (handoff / hors horaires). */
  mode?: AiCommsMode;
  locale?: "fr" | "en";
  /** Apparence réglée dans CRM → Site → Kady. */
  appearance?: KadyAppearance;
  /** Côté effectif (forcé à gauche quand le Live Chat 3CX occupe la droite). */
  side?: "left" | "right";
  /**
   * Aperçu admin : positionné dans son conteneur (pas sur la page), ouvert d'office, messages d'exemple,
   * aucun envoi réel.
   */
  preview?: { open: boolean; messages: Array<{ role: "user" | "assistant"; content: string }> };
};

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
  }, [open, messages, loading, preview]);

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
          _hp: hp ?? "",
        }),
      });

      const data = (await res.json()) as {
        answer?: string;
        links?: { label: string; href: string }[];
        openThreeCxLabel?: string;
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
        },
      ]);
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

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const hp = new FormData(e.currentTarget).get("_hp");
    void sendMessage(input, hp);
  }

  const shownMessages: Message[] = preview
    ? preview.messages.map((msg, i) => ({ id: `preview-${i}`, ...msg }))
    : messages;

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
                  </div>
                </div>
              ))}

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

            <form
              onSubmit={handleSubmit}
              className="relative flex gap-2 border-t border-gray/40 bg-[var(--kady-panel-bg)] p-3"
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
    </>
  );
}
