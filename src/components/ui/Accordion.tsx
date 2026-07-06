"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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

  const triggerClassName =
    "flex w-full items-center justify-between gap-4 py-5 text-left";

  const triggerContent = (
    <>
      <span className="font-semibold text-foreground">{question}</span>
      <ChevronDown
        className={cn(
          "h-5 w-5 shrink-0 text-primary transition-transform duration-200",
          open && "rotate-180",
        )}
        aria-hidden
      />
    </>
  );

  return (
    <div className="border-b border-gray last:border-0">
      {open ? (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={triggerClassName}
          aria-expanded="true"
        >
          {triggerContent}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={triggerClassName}
          aria-expanded="false"
        >
          {triggerContent}
        </button>
      )}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            role="region"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="pb-5 leading-relaxed text-gray-text">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
