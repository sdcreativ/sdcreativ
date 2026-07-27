import { describe, expect, it } from "vitest";
import {
  isAllowedCalendarAttachment,
  parseCalendarAttachment,
} from "@/lib/calendar-attachments";

describe("calendar-attachments", () => {
  it("accepte pdf, word, excel et images", () => {
    expect(isAllowedCalendarAttachment("brief.pdf", "application/pdf")).toBe(true);
    expect(isAllowedCalendarAttachment("note.doc", "application/msword")).toBe(true);
    expect(
      isAllowedCalendarAttachment(
        "note.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ).toBe(true);
    expect(isAllowedCalendarAttachment("budget.xls", "application/vnd.ms-excel")).toBe(true);
    expect(
      isAllowedCalendarAttachment(
        "budget.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ),
    ).toBe(true);
    expect(isAllowedCalendarAttachment("photo.jpg", "image/jpeg")).toBe(true);
    expect(isAllowedCalendarAttachment("photo.png", "image/png")).toBe(true);
  });

  it("refuse les formats non autorisés", () => {
    expect(isAllowedCalendarAttachment("virus.exe", "application/octet-stream")).toBe(false);
    expect(isAllowedCalendarAttachment("archive.zip", "application/zip")).toBe(false);
  });

  it("parse la métadonnée attachment", () => {
    expect(
      parseCalendarAttachment({
        attachment: {
          url: "/uploads/calendar/a.pdf",
          name: "a.pdf",
          mimeType: "application/pdf",
          size: 12,
        },
      }),
    ).toEqual({
      url: "/uploads/calendar/a.pdf",
      name: "a.pdf",
      mimeType: "application/pdf",
      size: 12,
    });
    expect(parseCalendarAttachment({})).toBeNull();
  });
});
