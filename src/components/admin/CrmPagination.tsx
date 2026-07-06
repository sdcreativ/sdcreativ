"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  page: number;
  totalPages: number;
  total: number;
  label: string;
  onPageChange: (page: number) => void;
};

export function CrmPagination({ page, totalPages, total, label, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between rounded-xl border border-gray/40 bg-white px-4 py-3 text-sm">
      <p className="text-gray-text">
        Page {page} / {totalPages} — {total} {label}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-3 py-1.5 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Précédent
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-3 py-1.5 disabled:opacity-40"
        >
          Suivant
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
