import { ChevronDown } from "lucide-react";

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
  return (
    <details
      className="group border-b border-gray last:border-0"
      defaultOpen={defaultOpen}
    >
      <summary className="flex w-full cursor-pointer list-none items-center justify-between gap-4 py-5 text-left font-semibold text-foreground [&::-webkit-details-marker]:hidden">
        {question}
        <ChevronDown
          className="h-5 w-5 shrink-0 text-primary transition-transform duration-200 group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <p className="pb-5 leading-relaxed text-gray-text">{answer}</p>
    </details>
  );
}
