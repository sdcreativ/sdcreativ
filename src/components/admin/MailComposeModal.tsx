"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle, Loader2, Paperclip, Send, X } from "lucide-react";
import { MailRecipientInput } from "@/components/admin/MailRecipientInput";
import { MailRichEditor } from "@/components/admin/MailRichEditor";
import { composeMailApi } from "@/lib/mail-api";
import type { CrmMailThread, CrmMailbox } from "@/lib/mail/types";

export type OutgoingAttachmentDraft = {
  filename: string;
  contentType: string;
  contentBase64: string;
  sizeBytes: number;
};

export async function filesToAttachmentDrafts(
  files: FileList | File[],
): Promise<OutgoingAttachmentDraft[]> {
  const list = Array.from(files);
  const out: OutgoingAttachmentDraft[] = [];
  for (const file of list) {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
    out.push({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      contentBase64: btoa(binary),
      sizeBytes: file.size,
    });
  }
  return out;
}

export function MailComposeModal({
  mailbox,
  mailboxes,
  onClose,
  onSent,
  initialTo = "",
  initialCc = "",
  initialBcc = "",
  initialSubject = "",
  initialBodyHtml = "",
  title = "Nouveau message",
}: {
  mailbox: CrmMailbox;
  mailboxes: CrmMailbox[];
  onClose: () => void;
  onSent: (thread: CrmMailThread) => void;
  initialTo?: string;
  initialCc?: string;
  initialBcc?: string;
  initialSubject?: string;
  initialBodyHtml?: string;
  title?: string;
}) {
  const [fromId, setFromId] = useState(mailbox.id);
  const [to, setTo] = useState(initialTo);
  const [cc, setCc] = useState(initialCc);
  const [bcc, setBcc] = useState(initialBcc);
  const [showCc, setShowCc] = useState(Boolean(initialCc || initialBcc));
  const [subject, setSubject] = useState(initialSubject);
  const [bodyHtml, setBodyHtml] = useState(initialBodyHtml);
  const [bodyText, setBodyText] = useState("");
  const [includeSignature, setIncludeSignature] = useState(true);
  const [attachments, setAttachments] = useState<OutgoingAttachmentDraft[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    try {
      const drafts = await filesToAttachmentDrafts(files);
      setAttachments((prev) => [...prev, ...drafts].slice(0, 8));
    } catch {
      setSendError("Impossible de lire une pièce jointe.");
    }
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!to.trim() || (!bodyText.trim() && !bodyHtml.trim()) || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const result = await composeMailApi({
        mailboxId: fromId,
        to: to.trim(),
        cc: cc.trim() || undefined,
        bcc: bcc.trim() || undefined,
        subject: subject.trim(),
        bodyText: bodyText.trim() || bodyHtml.replace(/<[^>]+>/g, " ").trim(),
        bodyHtml: bodyHtml.trim() || null,
        includeSignature,
        attachments: attachments.map(({ filename, contentType, contentBase64 }) => ({
          filename,
          contentType,
          contentBase64,
        })),
      });
      onSent(result.thread);
      setEditorKey((k) => k + 1);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Échec de l’envoi.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 backdrop-blur-[2px] sm:items-center sm:p-6">
      <form
        onSubmit={(e) => void handleSend(e)}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray/30 bg-gradient-to-r from-primary-light/80 to-white px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
              {title}
            </p>
            <h3 className="font-bold text-foreground">Composer</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-lg p-1 hover:bg-gray/20">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto px-5 py-4">
          {sendError && (
            <p className="flex items-start gap-1.5 rounded-xl border border-accent/25 bg-accent/5 px-3 py-2 text-xs text-accent">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {sendError}
            </p>
          )}

          <label className="block text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-text">De</span>
            <select
              value={fromId}
              onChange={(e) => setFromId(e.target.value)}
              disabled={sending || mailboxes.length < 2}
              className="mt-1 w-full rounded-xl border border-gray/50 bg-white px-3 py-2.5 outline-none focus:border-primary"
            >
              {mailboxes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.email}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <MailRecipientInput
                label="À"
                value={to}
                onChange={setTo}
                disabled={sending}
                required
                placeholder="destinataire@exemple.com"
              />
            </div>
            {!showCc && (
              <button
                type="button"
                onClick={() => setShowCc(true)}
                className="mb-0.5 shrink-0 text-xs font-semibold text-primary hover:underline"
              >
                Cc/Cci
              </button>
            )}
          </div>

          {showCc && (
            <>
              <MailRecipientInput
                label="Cc"
                value={cc}
                onChange={setCc}
                disabled={sending}
                placeholder="copie@exemple.com"
              />
              <MailRecipientInput
                label="Cci"
                value={bcc}
                onChange={setBcc}
                disabled={sending}
                placeholder="copie.cachee@exemple.com"
              />
            </>
          )}

          <label className="block text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-text">Objet</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={sending}
              placeholder="Sujet du message"
              className="mt-1 w-full rounded-xl border border-gray/50 px-3 py-2.5 outline-none focus:border-primary"
            />
          </label>

          <div className="text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-text">
              Message
            </span>
            <div className="mt-1">
              <MailRichEditor
                valueHtml={bodyHtml}
                editorKey={editorKey}
                disabled={sending}
                onChange={(html, text) => {
                  setBodyHtml(html);
                  setBodyText(text);
                }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray/40 px-3 py-2 text-xs font-semibold text-foreground hover:border-primary/40">
              <Paperclip className="h-3.5 w-3.5" aria-hidden />
              Joindre
              <input
                type="file"
                multiple
                className="hidden"
                disabled={sending}
                onChange={(e) => {
                  void handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            {attachments.map((att) => (
              <span
                key={`${att.filename}-${att.sizeBytes}`}
                className="inline-flex items-center gap-1 rounded-full bg-gray/20 px-2.5 py-1 text-[11px]"
              >
                {att.filename}
                <button
                  type="button"
                  onClick={() =>
                    setAttachments((prev) => prev.filter((a) => a !== att))
                  }
                  aria-label={`Retirer ${att.filename}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs text-gray-text">
            <input
              type="checkbox"
              checked={includeSignature}
              onChange={(e) => setIncludeSignature(e.target.checked)}
              disabled={sending}
            />
            Inclure la signature SD CREATIV
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray/30 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-gray-text hover:bg-gray/20"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={sending || !to.trim() || (!bodyText.trim() && !bodyHtml.trim())}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Send className="h-4 w-4" aria-hidden />
            )}
            Envoyer
          </button>
        </div>
      </form>
    </div>
  );
}
