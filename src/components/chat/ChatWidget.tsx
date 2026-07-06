"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Bot, Loader2, Send, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { chatGreeting, chatSuggestions } from "@/content/chat-knowledge";
import { HoneypotField } from "@/components/forms/HoneypotField";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  links?: { label: string; href: string }[];
};

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && !initialized) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: chatGreeting,
          links: [
            { label: "Solutions IA", href: "/solutions-ia" },
            { label: "Devis en ligne", href: "/devis" },
          ],
        },
      ]);
      setInitialized(true);
    }
  }, [open, initialized]);

  useEffect(() => {
    if (open) {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [open, messages, loading]);

  async function sendMessage(text: string, hp?: FormDataEntryValue | null) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

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
        body: JSON.stringify({ message: trimmed, _hp: hp ?? "" }),
      });

      const data = (await res.json()) as {
        answer?: string;
        links?: { label: string; href: string }[];
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
          content: data.answer ?? "Désolé, une erreur est survenue.",
          links: data.links,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${crypto.randomUUID()}`,
          role: "assistant",
          content:
            "Impossible de répondre pour le moment. Contactez-nous via WhatsApp ou le formulaire de contact.",
          links: [{ label: "Contact", href: "/contact" }],
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

  const toggleClassName = cn(
    "fixed bottom-24 left-4 z-[55] flex h-14 items-center gap-2 rounded-full px-4 shadow-lg shadow-black/20 transition-all hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:bottom-8 md:left-8",
    open ? "bg-dark text-white" : "bg-primary text-white",
  );

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-36 left-4 z-[55] flex h-[min(520px,calc(100vh-10rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-gray/40 bg-white shadow-2xl shadow-black/15 md:bottom-28 md:left-8"
            id="chat-widget-panel"
            role="dialog"
            aria-label="Assistant SD CREATIV"
          >
            <header className="flex items-center gap-3 bg-dark px-4 py-3.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary">
                <Bot className="h-5 w-5 text-white" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">Assistant SD CREATIV</p>
                <p className="text-xs text-white/60">Propulsé par IA · Démo live</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Fermer le chat"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    msg.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-primary text-white"
                        : "bg-gray-light text-foreground",
                    )}
                  >
                    <p>{msg.content}</p>
                    {msg.links && msg.links.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {msg.links.map((link) => (
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
                  <div className="flex items-center gap-2 rounded-2xl bg-gray-light px-4 py-2.5 text-sm text-gray-text">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Réflexion…
                  </div>
                </div>
              )}

              {messages.length === 1 && !loading && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {chatSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void sendMessage(suggestion)}
                      className="rounded-full border border-primary/30 bg-primary-light px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary hover:text-white"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <form
              onSubmit={handleSubmit}
              className="relative flex gap-2 border-t border-gray/40 bg-white p-3"
            >
              <HoneypotField />
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Votre question…"
                maxLength={500}
                disabled={loading}
                className="min-w-0 flex-1 rounded-xl border border-gray/60 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                aria-label="Votre message"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
                aria-label="Envoyer"
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
          aria-label="Fermer l'assistant"
          aria-expanded="true"
        >
          <X className="h-6 w-6" aria-hidden />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={toggleClassName}
          aria-label="Ouvrir l'assistant SD CREATIV"
          aria-expanded="false"
        >
          <Bot className="h-6 w-6" aria-hidden />
          <span className="hidden text-sm font-semibold sm:inline">Assistant IA</span>
        </button>
      )}
    </>
  );
}
