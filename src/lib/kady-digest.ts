import { escapeHtml, sendEmail } from "@/lib/email";
import { getKadyAppearance } from "@/lib/kady-settings";
import { getKadyWeeklyStats, listQuestionsToImprove, type QuestionToImprove } from "@/lib/chat-conversations";

/** Corps du bilan hebdomadaire de l'assistante (pur, testable). */
export function buildKadyDigestHtml(
  stats: { conversations: number; leads: number; thumbsUp: number; thumbsDown: number },
  questions: QuestionToImprove[],
  siteUrl: string,
  assistantName: string,
): string {
  const name = escapeHtml(assistantName);
  const list = questions
    .slice(0, 15)
    .map(
      (q) =>
        `<li>${escapeHtml(q.question)} <span style="color:#6b7280">— ${q.reason === "thumbs_down" ? "réponse jugée inutile 👎" : "pas de réponse trouvée"}</span></li>`,
    )
    .join("");
  return `
    <h2>${name} — bilan des 7 derniers jours</h2>
    <p><strong>${stats.conversations}</strong> conversation(s) · <strong>${stats.leads}</strong> prospect(s) · ${stats.thumbsUp} 👍 / ${stats.thumbsDown} 👎</p>
    ${
      questions.length
        ? `<p><strong>${questions.length} question(s) à améliorer</strong> : ajoutez une réponse pour que ${name} sache y répondre la prochaine fois.</p><ul>${list}</ul>`
        : `<p>Aucune question en attente : ${name} a trouvé une réponse à tout.</p>`
    }
    <p><a href="${siteUrl}/admin/crm/site/kady/questions">Traiter les questions</a> · <a href="${siteUrl}/admin/crm/conversations">Lire les conversations</a></p>
  `;
}

/** Bilan hebdomadaire envoyé à l'équipe ; rien n'est envoyé s'il n'y a eu aucune conversation. */
export async function sendKadyWeeklyDigest(): Promise<{ sent: boolean; conversations: number; questions: number }> {
  const [stats, questions, appearance] = await Promise.all([
    getKadyWeeklyStats(7),
    listQuestionsToImprove({ sinceDays: 7 }),
    getKadyAppearance(),
  ]);
  if (stats.conversations === 0) return { sent: false, conversations: 0, questions: questions.length };
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
  const sent = await sendEmail({
    subject: `[SD CREATIV] ${appearance.name} cette semaine : ${stats.conversations} conversation(s), ${stats.leads} prospect(s)`,
    html: buildKadyDigestHtml(stats, questions, siteUrl, appearance.name),
  });
  return { sent, conversations: stats.conversations, questions: questions.length };
}
