import type { QuoteLine } from "@/lib/quote-calculator";
import type { ServiceCatalogItem } from "@/lib/service-catalog";

export type QuoteComposerLine = {
  id: string;
  catalogItemId?: string;
  label: string;
  quantity: number;
  unitPrice: number;
};

export function createComposerLine(input?: Partial<QuoteComposerLine>): QuoteComposerLine {
  return {
    id: crypto.randomUUID(),
    catalogItemId: input?.catalogItemId,
    label: input?.label ?? "",
    quantity: input?.quantity ?? 1,
    unitPrice: input?.unitPrice ?? 0,
  };
}

export function composerLineFromCatalogItem(item: ServiceCatalogItem): QuoteComposerLine {
  return createComposerLine({
    catalogItemId: item.id,
    label: item.name,
    quantity: 1,
    unitPrice: item.unitPrice,
  });
}

export function composerLineAmount(line: QuoteComposerLine): number {
  return Math.max(0, Math.round(line.quantity * line.unitPrice));
}

export function composerLinesSubtotal(lines: QuoteComposerLine[]): number {
  return lines.reduce((sum, line) => sum + composerLineAmount(line), 0);
}

export function composerLinesToQuoteLines(lines: QuoteComposerLine[]): QuoteLine[] {
  return lines
    .filter((line) => line.label.trim() && composerLineAmount(line) > 0)
    .map((line) => {
      const amount = composerLineAmount(line);
      const label =
        line.quantity > 1 ? `${line.label.trim()} (×${line.quantity})` : line.label.trim();
      return {
        label,
        amount,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        catalogItemId: line.catalogItemId,
      };
    });
}
