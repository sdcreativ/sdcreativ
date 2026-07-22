# Communications

Messagerie, 3CX, calendrier, tickets.

[[← Accueil|Home]]

### Messagerie Hostinger · _Récent_

> Boîtes pro IMAP/SMTP dans le CRM.

**Explication**

Sync, composition, suppressions, liaisons lead/client. Corps HTML rendu (liens/boutons). Activation runtime via `CRM_MESSAGERIE_ENABLED` dans `.env.docker`.

**Fonctionnement**

Messagerie → connecter / choisir la boîte → sync → lire (HTML) → répondre ou composer. Cron mail-sync sur le VPS si activé.

**Lien :** [/admin/crm/messagerie](https://sdcreativ.com/admin/crm/messagerie)

**Captures**

![Messagerie Hostinger — messagerie.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/messagerie.png)

---

### Communications & 3CX · _Récent_

> Téléphonie : appels, screen-pop, stats.

**Explication**

Intégration 3CX : widget, API, pop CRM à l’appel entrant, stats et aides. Création / ouverture de lead depuis un appel.

**Fonctionnement**

Communications pour les stats. À un appel entrant, le screen-pop `/admin/crm/3cx-pop` affiche le contact → créer ou ouvrir le lead.

**Lien :** [/admin/crm/communications](https://sdcreativ.com/admin/crm/communications)

**Captures**

![Communications & 3CX — communications-3cx.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/communications-3cx.png)

---

### Tickets support

> Support client avec fil de messages.

**Explication**

Tickets CRM + portail ; notification admin quand le client écrit.

**Fonctionnement**

Tickets → ouvrir → répondre dans le fil → changer le statut / SLA selon process.

**Lien :** [/admin/crm/tickets](https://sdcreativ.com/admin/crm/tickets)

**Captures**

![Tickets support — tickets.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/tickets.png)

![Tickets support — tickets_02.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/tickets_02.png)

---

### Calendrier · _Récent_

> Agenda CRM avec invitations multi-canal.

**Explication**

Événements, participants, rappels (email/SMS selon config).

**Fonctionnement**

Calendrier → créer un événement → ajouter participants → envoyer les invitations.

**Lien :** [/admin/crm/calendrier](https://sdcreativ.com/admin/crm/calendrier)

**Captures**

![Calendrier — calendrier.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/calendrier.png)

![Calendrier — calendrier_02.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/calendrier_02.png)

![Calendrier — calendrier_03.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/calendrier_03.png)

![Calendrier — calendrier_04.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/calendrier_04.png)

![Calendrier — calendrier_05.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/calendrier_05.png)

![Calendrier — calendrier_06.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/calendrier_06.png)

---

