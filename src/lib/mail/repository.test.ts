import { describe, expect, it } from "vitest";
import { mapAttachment, mapDraft, mapMailbox, mapMessage, mapThread } from "@/lib/mail/repository";

describe("mail repository mappers (Phase 1.1)", () => {
  it("mappe une boîte sans exposer les credentials par défaut", () => {
    const mailbox = mapMailbox({
      id: "11111111-1111-1111-1111-111111111111",
      email: "contact@sdcreativ.com",
      display_name: "Contact",
      imap_host: "imap.hostinger.com",
      imap_port: 993,
      smtp_host: "smtp.hostinger.com",
      smtp_port: 465,
      credentials_encrypted: "v1:secret",
      active: true,
      user_id: null,
      last_sync_at: null,
      last_uid: 42,
      last_error: null,
      created_at: new Date("2026-07-16T10:00:00.000Z"),
      updated_at: new Date("2026-07-16T10:00:00.000Z"),
    });

    expect(mailbox.email).toBe("contact@sdcreativ.com");
    expect(mailbox.lastUid).toBe(42);
    expect(mailbox.credentialsEncrypted).toBeUndefined();
  });

  it("mappe thread, message et pièce jointe", () => {
    const thread = mapThread({
      id: "22222222-2222-2222-2222-222222222222",
      mailbox_id: "11111111-1111-1111-1111-111111111111",
      subject: "Devis site",
      snippet: "Bonjour…",
      participants: ["client@example.com", "contact@sdcreativ.com"],
      last_message_at: new Date("2026-07-16T11:00:00.000Z"),
      unread_count: 1,
      client_id: null,
      lead_id: null,
      status: "open",
      created_at: new Date("2026-07-16T10:00:00.000Z"),
      updated_at: new Date("2026-07-16T11:00:00.000Z"),
    });
    expect(thread.participants).toEqual(["client@example.com", "contact@sdcreativ.com"]);
    expect(thread.status).toBe("open");

    const message = mapMessage({
      id: "33333333-3333-3333-3333-333333333333",
      thread_id: thread.id,
      mailbox_id: thread.mailboxId,
      message_id: "<abc@host>",
      in_reply_to: null,
      uid: 7,
      folder: "INBOX",
      from_address: "client@example.com",
      to_addresses: ["contact@sdcreativ.com"],
      cc_addresses: [],
      subject: "Devis site",
      body_text: "Bonjour",
      body_html: null,
      received_at: new Date("2026-07-16T11:00:00.000Z"),
      direction: "inbound",
      raw_headers: { "message-id": "<abc@host>" },
      created_at: new Date("2026-07-16T11:00:00.000Z"),
    });
    expect(message.uid).toBe(7);
    expect(message.direction).toBe("inbound");

    const attachment = mapAttachment({
      id: "44444444-4444-4444-4444-444444444444",
      message_id: message.id,
      filename: "devis.pdf",
      content_type: "application/pdf",
      size_bytes: 1200,
      s3_key: null,
      created_at: new Date("2026-07-16T11:00:00.000Z"),
    });
    expect(attachment.filename).toBe("devis.pdf");
    expect(attachment.sizeBytes).toBe(1200);
  });

  it("mappe un brouillon", () => {
    const draft = mapDraft({
      id: "55555555-5555-5555-5555-555555555555",
      thread_id: "22222222-2222-2222-2222-222222222222",
      user_id: "66666666-6666-6666-6666-666666666666",
      body_text: "Brouillon…",
      body_html: null,
      include_signature: true,
      created_at: new Date("2026-07-16T12:00:00.000Z"),
      updated_at: new Date("2026-07-16T12:01:00.000Z"),
    });
    expect(draft.bodyText).toBe("Brouillon…");
    expect(draft.includeSignature).toBe(true);
  });
});
