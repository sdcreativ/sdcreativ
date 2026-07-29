import { describe, expect, it } from "vitest";
import {
  MAX_CALENDAR_MAIL_ATTACHMENTS_BYTES,
  validateCalendarMailAttachments,
} from "@/lib/calendar-mail-limits";

describe("calendar-mail-limits", () => {
  it("accepte un total sous la limite", () => {
    const result = validateCalendarMailAttachments([
      { name: "a.pdf", size: 2 * 1024 * 1024 },
      { name: "b.pdf", size: 3 * 1024 * 1024 },
    ]);
    expect(result.ok).toBe(true);
  });

  it("refuse un total trop lourd pour le mail", () => {
    const result = validateCalendarMailAttachments([
      { name: "a.pdf", size: 9 * 1024 * 1024 },
      { name: "b.pdf", size: 9 * 1024 * 1024 },
      { name: "c.pdf", size: 9 * 1024 * 1024 },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/trop lourdes/i);
    }
  });

  it("refuse plus de 5 fichiers", () => {
    const files = Array.from({ length: 6 }, (_, i) => ({
      name: `f${i}.pdf`,
      size: 100,
    }));
    const result = validateCalendarMailAttachments(files);
    expect(result.ok).toBe(false);
  });
});
