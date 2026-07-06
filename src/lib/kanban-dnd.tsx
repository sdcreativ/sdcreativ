"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type KanbanDropColumnProps = {
  columnId: string;
  isDropTarget: boolean;
  dragMime: string;
  onDrop: (itemId: string) => void;
  onDragOverChange: (columnId: string | null) => void;
  className?: string;
  children: ReactNode;
};

/** Colonne kanban avec zone de dépôt HTML5. */
export function KanbanDropColumn({
  columnId,
  isDropTarget,
  dragMime,
  onDrop,
  onDragOverChange,
  className,
  children,
}: KanbanDropColumnProps) {
  return (
    <div
      className={cn(
        "w-72 shrink-0 rounded-xl border p-3 transition-colors",
        isDropTarget ? "border-primary bg-primary-light/30" : "border-gray/40 bg-gray-light/50",
        className,
      )}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragOverChange(columnId);
      }}
      onDragLeave={() => onDragOverChange(null)}
      onDrop={(e) => {
        e.preventDefault();
        onDragOverChange(null);
        const itemId = e.dataTransfer.getData(dragMime);
        if (itemId) onDrop(itemId);
      }}
    >
      {children}
    </div>
  );
}

export const KANBAN_DRAG_MIME = {
  project: "application/x-sdcreativ-project-id",
  lead: "application/x-sdcreativ-lead-id",
  task: "application/x-sdcreativ-task-id",
  ticket: "application/x-sdcreativ-ticket-id",
  quote: "application/x-sdcreativ-quote-id",
} as const;
