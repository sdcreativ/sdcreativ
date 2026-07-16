"use client";

import { useEffect, useRef } from "react";
import { Bold, Italic, Link2, List } from "lucide-react";

type Props = {
  valueHtml: string;
  onChange: (html: string, text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Change cette clé pour réinitialiser le contenu (ex. après envoi). */
  editorKey?: string | number;
};

function htmlToText(html: string): string {
  if (typeof document === "undefined") {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent || "").replace(/\u00a0/g, " ").trim();
}

export function MailRichEditor({
  valueHtml,
  onChange,
  disabled,
  placeholder = "Écrivez votre message…",
  editorKey = "default",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.innerHTML !== valueHtml) {
      el.innerHTML = valueHtml || "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remount/reset via editorKey
  }, [editorKey]);

  function emit() {
    const el = ref.current;
    if (!el) return;
    const nextHtml = el.innerHTML;
    onChange(nextHtml, htmlToText(nextHtml));
  }

  function run(cmd: string, value?: string) {
    if (disabled) return;
    ref.current?.focus();
    document.execCommand(cmd, false, value);
    emit();
  }

  function addLink() {
    const url = window.prompt("URL du lien");
    if (!url?.trim()) return;
    run("createLink", url.trim());
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray/50 focus-within:border-primary">
      <div className="flex flex-wrap gap-1 border-b border-gray/30 bg-gray-light/40 px-2 py-1.5">
        <button
          type="button"
          disabled={disabled}
          onClick={() => run("bold")}
          className="rounded-lg p-1.5 text-gray-text hover:bg-white hover:text-foreground disabled:opacity-40"
          aria-label="Gras"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => run("italic")}
          className="rounded-lg p-1.5 text-gray-text hover:bg-white hover:text-foreground disabled:opacity-40"
          aria-label="Italique"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => run("insertUnorderedList")}
          className="rounded-lg p-1.5 text-gray-text hover:bg-white hover:text-foreground disabled:opacity-40"
          aria-label="Liste"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={addLink}
          className="rounded-lg p-1.5 text-gray-text hover:bg-white hover:text-foreground disabled:opacity-40"
          aria-label="Lien"
        >
          <Link2 className="h-4 w-4" />
        </button>
      </div>
      <div
        key={editorKey}
        ref={ref}
        role="textbox"
        aria-multiline
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emit}
        className="min-h-[160px] px-3 py-2.5 text-sm outline-none empty:before:pointer-events-none empty:before:text-gray-text/60 empty:before:content-[attr(data-placeholder)]"
      />
    </div>
  );
}
