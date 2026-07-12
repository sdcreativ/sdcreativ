"use client";

import { useCallback, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: string[];
  onChange: (tags: string[]) => void;
  className?: string;
};

function parseInput(raw: string): string[] {
  return raw
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}

export function BlogTagsInput({ value, onChange, className }: Props) {
  const [draft, setDraft] = useState("");

  const addTags = useCallback(
    (incoming: string[]) => {
      if (incoming.length === 0) return;
      const merged = [...new Set([...value, ...incoming.map((t) => t.slice(0, 50))])].slice(0, 30);
      onChange(merged);
    },
    [onChange, value],
  );

  function commitDraft() {
    const next = parseInput(draft);
    if (next.length === 0) {
      setDraft("");
      return;
    }
    addTags(next);
    setDraft("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitDraft();
    }
    if (e.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function removeTag(tag: string) {
    onChange(value.filter((item) => item !== tag));
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex min-h-[42px] flex-wrap gap-2 rounded-lg border border-gray/60 bg-white px-2 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2.5 py-1 text-xs font-medium text-primary"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="rounded-full p-0.5 hover:bg-primary/10"
              aria-label={`Retirer ${tag}`}
            >
              <X className="h-3 w-3" aria-hidden />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitDraft}
          placeholder={value.length === 0 ? "seo, abidjan, pme…" : "Ajouter…"}
          className="min-w-[120px] flex-1 border-0 bg-transparent px-1 py-1 text-sm focus:outline-none"
          aria-label="Tags"
        />
      </div>
      <p className="text-xs text-gray-text">
        Entrée ou virgule pour ajouter · max 30 tags · filtrables dans la liste admin
      </p>
    </div>
  );
}
