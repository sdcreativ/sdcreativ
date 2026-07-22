# Infra & ops techniques

Santé VPS, flags Docker, déploiements.

[[← Accueil|Home]]

### Widget santé VPS · _Récent_

> Métriques, Docker, restauration (permission infra.view).

**Explication**

Surveille l’infra depuis le dashboard pour les profils autorisés.

**Fonctionnement**

Dashboard → widget infra → consulter métriques / actions de restauration selon droits.

**Lien :** [/admin/crm](https://sdcreativ.com/admin/crm)

**Captures**

![Widget santé VPS — dashboard-infra.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/dashboard-infra.png)

---

### Flags runtime (.env.docker) · _Récent_

> Source de vérité des variables en production Docker.

**Explication**

Ex. `CRM_MESSAGERIE_ENABLED`, `CRON_SECRET`. Les `NEXT_PUBLIC_*` sont figés au build sauf build-args.

**Fonctionnement**

Éditer `.env.docker` sur le VPS → `docker compose restart app` (ou redeploy) pour les flags runtime.

**Captures**

![Flags runtime (.env.docker) — dashboard-infra.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/dashboard-infra.png)

---

