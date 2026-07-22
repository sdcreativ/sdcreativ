# Marketing

Newsletter, waitlist, séquences et campagnes promo.

[[← Accueil|Home]]

### Newsletter

> Abonnés newsletter du site.

**Explication**

Liste des emails inscrits (actif / désabonné), source et date.

**Fonctionnement**

Marketing → Newsletter → désabonner ou supprimer un contact.

**Lien :** [/admin/crm/marketing](https://sdcreativ.com/admin/crm/marketing)

**Captures**

![Newsletter — marketing-newsletter_02.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/marketing-newsletter_02.png)

---

### Waitlist

> Inscriptions d’intérêt (Phase 2 / produits).

**Explication**

Collecte les demandes d’intérêt (espace client, CRM, etc.) depuis le site.

**Fonctionnement**

Marketing → Waitlist → consulter / supprimer les inscriptions.

**Lien :** [/admin/crm/marketing](https://sdcreativ.com/admin/crm/marketing)

**Captures**

![Waitlist — marketing-waitlist.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/marketing-waitlist.png)

---

### Séquences email

> Automations email sur les leads (J+0, J+3, J+7…).

**Explication**

Enrôle les leads selon un statut déclencheur et envoie les étapes via cron.

**Fonctionnement**

Marketing → Séquences → activer/désactiver. Cron `GET /api/cron/marketing-sequences` avec `CRON_SECRET`.

**Lien :** [/admin/crm/marketing](https://sdcreativ.com/admin/crm/marketing)

**Captures**

![Séquences email — marketing-sequences.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/marketing-sequences.png)

---

### Campagnes de relance promotionnelles · _Récent_

> Offre garantie datée sur devis tièdes + opt-in (sans loterie).

**Explication**

Relance commerciale excitante : offre limitée dans le temps, CTA « Je suis intéressé », puis tâche pour le commercial. Opt-in = newsletter active OU flag lead.

**Fonctionnement**

Marketing → Campagnes → créer (nom, offre, dates) → Activer → Sync audience → Envoyer emails. Le destinataire ouvre `/promo/[token]` → confirme → tâche + notif CRM. Cron optionnel : `/api/cron/promo-campaigns`.

**Lien :** [/admin/crm/marketing](https://sdcreativ.com/admin/crm/marketing)

**Captures**

![Campagnes de relance promotionnelles — marketing-campagnes-promo.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/marketing-campagnes-promo.png)

---

