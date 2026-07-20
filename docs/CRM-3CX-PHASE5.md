# Phase 5 — Expérience CRM (équipe SD CREATIV)

UI CRM pour l’historique 3CX, accès Web Client, et process réunions WebMeeting.

---

## Livrables code

| Élément | Emplacement |
|---------|-------------|
| Liste Communications | `/admin/crm/communications` · `CrmCommunicationsView` |
| Section fiche lead/client | `ThreeCxLinkedEventsSection` |
| API | `GET /api/admin/communications`, `GET /api/admin/communications/web-client` |
| Permissions | `communications.read` / `communications.write` |
| Header CRM | Bouton **Web Client 3CX** (si URL résolue) |

---

## Variables d’environnement

```bash
# FQDN PBX → URL Web Client par défaut https://{fqdn}
THREE_CX_PBX_FQDN=1229.3cx.cloud
# Ou URL explicite (prioritaire)
NEXT_PUBLIC_THREE_CX_WEB_CLIENT_URL=https://1229.3cx.cloud
```

Le bouton header et la page Communications appellent l’API admin (pas le bundle client) : le FQDN serveur suffit au runtime.

---

## Process réunions — WebMeeting 3CX

Objectif : réunions internes / clients en visioconférence navigateur, sans softphone desktop obligatoire.

### 1. Prérequis agents

- Extension 3CX active + connexion **Web Client**
- Droits WebMeeting selon licence (voir Phase 1 / console)
- Caméra / micro autorisés dans le navigateur

### 2. Créer une réunion

1. Ouvrir le **Web Client 3CX** (bouton CRM header ou page Communications)
2. Lancer **WebMeeting** / nouvelle conférence
3. Copier le **lien d’invitation**

### 3. Partager le lien (calendrier / RDV)

| Canal | Pratique recommandée |
|-------|----------------------|
| Calendrier CRM | Créer un événement ; coller le lien WebMeeting dans la description / notes |
| RDV public (`/rendez-vous`) | Après confirmation, envoyer le lien WebMeeting par email / WhatsApp |
| Client externe | Lien WebMeeting uniquement (pas besoin de compte 3CX) |

Ne pas inventer une synchro auto calendrier ↔ 3CX dans le MVP : le lien reste la source de vérité.

### 4. Pendant / après

- L’hôte reste sur le Web Client ; les invités rejoignent via le lien
- Si journalisation meeting activée (PRO / API) : l’événement peut apparaître dans **Communications** (canal `meeting`)
- Sinon : noter manuellement sur la fiche lead/client (activité)

### 5. Checklist ops

- [ ] Chaque agent SD CREATIV a testé une WebMeeting agent ↔ agent
- [ ] Lien type collé une fois dans un événement calendrier CRM (modèle interne)
- [ ] Équipe sait où cliquer : header CRM → Web Client 3CX

---

## Click-to-call (hors MVP Phase 5)

Optionnel plus tard : bouton « Appeler » sur fiche lead si API MakeCall / extension agent disponible. Non livré dans cette phase.

---

## Tests manuels

- [ ] Nav **Ops → Communications** visible avec `communications.read`
- [ ] Liste vide OK sans journal ; avec données : deep-link vers lead/client
- [ ] Extension agent affichée quand fournie par le journal
- [ ] Fiche lead/client : section Communications 3CX
- [ ] Header : **Web Client 3CX** ouvre le PBX
- [ ] Process WebMeeting documenté et lu par l’équipe
