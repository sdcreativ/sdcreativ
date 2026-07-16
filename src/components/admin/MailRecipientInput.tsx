"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  searchMailContactsApi,
  type MailContactSuggestion,
} from "@/lib/mail-api";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
};

export function MailRecipientInput({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  required,
}: Props) {
  const listId = useId();
  const [suggestions, setSuggestions] = useState<MailContactSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<number | null>(null);

  useEffect(() => {
    const q = value.split(/[,;\s]+/).pop()?.trim() ?? "";
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void searchMailContactsApi(q)
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, 220);
    return () => window.clearTimeout(timer);
  }, [value]);

  function pick(email: string) {
    const parts = value
      .split(/[,;]/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length === 0) {
      onChange(email);
    } else {
      parts[parts.length - 1] = email;
      onChange(parts.join(", "));
    }
    setOpen(false);
    setSuggestions([]);
  }

  return (
    <label className="relative block text-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-text">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = window.setTimeout(() => setOpen(false), 150);
        }}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={listId}
        className="mt-1 w-full rounded-xl border border-gray/50 px-3 py-2.5 outline-none focus:border-primary"
      />
      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-gray/30 bg-white py-1 shadow-lg"
        >
          {suggestions.map((s) => (
            <li key={`${s.source}-${s.email}`}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                className={cn(
                  "flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-primary-light/60",
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s.email)}
              >
                <span className="font-medium text-foreground">{s.name}</span>
                <span className="text-xs text-gray-text">
                  {s.email} · {s.source === "client" ? "client" : "lead"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </label>
  );
}
