"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCrmSearchTypeLabel, type CrmSearchResult } from "@/lib/crm-search-types";
import { searchCrmApi } from "@/lib/crm-search-api";
import { cn } from "@/lib/utils";
import { FileText, FolderKanban, Loader2, Search, Target, Users } from "lucide-react";

const TYPE_ICONS = {
  lead: Target,
  client: Users,
  project: FolderKanban,
  quote: FileText,
} as const;

export type CrmGlobalSearchHandle = {
  focus: () => void;
};

export const CrmGlobalSearch = forwardRef<CrmGlobalSearchHandle>(function CrmGlobalSearch(_props, ref) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CrmSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
      setOpen(true);
    },
  }));

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = window.setTimeout(() => {
      void searchCrmApi(q)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 280);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    if (results.length > 0) {
      router.push(results[0]!.href);
      setQuery("");
      return;
    }
    router.push(`/admin/crm/leads?q=${encodeURIComponent(q)}`);
  }

  function handleSelect(result: CrmSearchResult) {
    setOpen(false);
    setQuery("");
    router.push(result.href);
  }

  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative w-full sm:w-auto">
      <form onSubmit={handleSubmit} className="relative">
        <label className="sr-only" htmlFor="crm-global-search">
          Rechercher dans le CRM
        </label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-text"
          aria-hidden
        />
        <input
          ref={inputRef}
          id="crm-global-search"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Rechercher… (Ctrl+K)"
          className="w-full rounded-xl border border-gray/60 bg-gray-light/50 py-2.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-52 lg:w-64"
          autoComplete="off"
        />
      </form>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-gray/40 bg-white shadow-xl sm:left-auto sm:w-80">
          {loading ? (
            <p className="flex items-center gap-2 px-4 py-3 text-sm text-gray-text">
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
              Recherche…
            </p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-text">Aucun résultat pour « {query.trim()} ».</p>
          ) : (
            <ul className="max-h-72 overflow-y-auto py-1">
              {results.map((result) => {
                const Icon = TYPE_ICONS[result.type];
                return (
                  <li key={`${result.type}-${result.id}`}>
                    <button
                      type="button"
                      onClick={() => handleSelect(result)}
                      className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-gray-light/50"
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {result.title}
                        </span>
                        <span className="block truncate text-xs text-gray-text">{result.subtitle}</span>
                        <span
                          className={cn(
                            "mt-1 inline-block rounded-full bg-gray-light px-2 py-0.5 text-[10px] font-bold text-gray-text",
                          )}
                        >
                          {getCrmSearchTypeLabel(result.type)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="border-t border-gray/20 px-4 py-2">
            {results.length > 0 ? (
              <p className="text-xs text-gray-text">
                {results.length} résultat(s) — cliquez pour ouvrir ou appuyez sur Entrée
              </p>
            ) : (
              <Link
                href={`/admin/crm/leads?q=${encodeURIComponent(query.trim())}`}
                onClick={() => setOpen(false)}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Rechercher dans les leads →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
