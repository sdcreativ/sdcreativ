"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

type AccordionItemProps = {
  question: string;
  answer: string;
  defaultOpen?: boolean;
};

export function AccordionItem({
  question,
  answer,
  defaultOpen = false,
}: AccordionItemProps) {
  const [open, setOpen] = useState(defaultOpen);
  const reactId = useId();
  const panelId = `${reactId}-panel`;
  const triggerId = `${reactId}-trigger`;
  const reduceMotion = useReducedMotion();

  return (
    <div className="border-b border-gray last:border-0">
      <button
        type="button"
        id={triggerId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className="font-semibold text-foreground">{question}</span>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-primary transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={triggerId}
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.25 }}
            className="overflow-hidden"
          >
            <p className="pb-5 leading-relaxed text-gray-text">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
