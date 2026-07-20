# Phase 4 — Template CRM 3CX (complète)

Deux chemins selon l’édition 3CX :

| Édition | Intégration | Statut |
|---------|-------------|--------|
| **PME (actuel)** | Screen-pop URL → fiche CRM | **Opérationnel** |
| **Dédié / PRO** | Template XML server-side | Prêt à uploader |

---

## A. Chemin PME (ton instance `1229.3cx.cloud`)

### 1. Console 3CX

**Réglages → Intégration → Intégration CRM**

1. Sélectionner **« Ouvrir le contact dans un CRM personnalisé »**
2. **URL du contact** :
```text
https://sdcreativ.com/admin/crm/3cx-pop?phone=%CallerNumber%&name=%CallerDisplayName%
```
3. **Informer lorsque** : **Sonnerie**
4. **Sauvegarder**

Constante code : `THREECX_PME_SCREEN_POP_URL` dans `src/lib/threecx/screen-pop.ts`.

### 2. Comportement

| Situation | Résultat |
|-----------|----------|
| Numéro = client existant | Redirect `/admin/crm/clients?id=…` |
| Numéro = lead existant | Redirect `/admin/crm/leads?id=…` |
| Inconnu | Modal **Nouveau lead** prérempli (tél + nom, source `call_3cx`) |

Prérequis : agent **connecté au CRM** dans le navigateur ; popups autorisées.

### 3. Tests PME

- [ ] Appel entrant numéro **connu** → fiche ouverte
- [ ] Appel numéro **inconnu** → création lead préremplie
- [ ] Agent non connecté CRM → page login puis retry

---

## B. Chemin Dédié / PRO (template XML)

Fichier : [`integrations/3cx/sdcreativ-crm.xml`](../integrations/3cx/sdcreativ-crm.xml)

### Prérequis

- [ ] API Phase 3 déployée
- [ ] `THREE_CX_CRM_TOKEN` dans `.env.docker` + rebuild
- [ ] Migration `0008` appliquée
- [ ] Menu 3CX **CRM / Upload template** disponible (pas sur PME)

### Upload

1. Admin 3CX → Intégrations → CRM → Upload `sdcreativ-crm.xml`
2. Paramètres :
   - API Base = `https://sdcreativ.com/api/integrations/3cx`
   - CRM Token = `THREE_CX_CRM_TOKEN`
   - Call / Chat journaling / Create = True

### Tests e2e (PRO)

- [ ] Chat anonyme → lead + activité
- [ ] Chat email connu → match
- [ ] Appel connu → fiche
- [ ] Appel inconnu → lead
- [ ] Retry journal → pas de doublon

Détail API : [`CRM-3CX-API.md`](./CRM-3CX-API.md).

---

## Token `THREE_CX_CRM_TOKEN`

| Usage | PME screen-pop | Template XML PRO |
|-------|----------------|------------------|
| Requis ? | Non | Oui |
| Où | — | `.env.docker` + param 3CX |

---

## Checklist Phase 4 « done »

- [x] Template XML dans le repo
- [x] Screen-pop PME `/admin/crm/3cx-pop`
- [x] Prefill création lead depuis appel
- [x] Runbook dual-path (ce fichier)
- [ ] Ops : URL collée + testé sur `1229.3cx.cloud` *(à cocher après ton test)*
- [ ] Ops PRO : upload XML *(quand édition le permet)*
