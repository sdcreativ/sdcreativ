# Rôles CRM — SD CREATIV

Document de référence pour créer les **rôles personnalisés** dans **Paramètres → Équipe → Rôles & permissions**.

Les 4 rôles **système** (`admin`, `commercial`, `project_manager`, `readonly`) sont déjà créés automatiquement au premier démarrage. Ils ne peuvent pas être supprimés ; leurs permissions peuvent être ajustées si besoin.

---

## Catalogue des permissions

| Permission | Libellé UI | Module concerné |
|------------|------------|-----------------|
| `users.manage` | Gérer les utilisateurs | Paramètres → Équipe |
| `settings.manage` | Modifier paramètres & branding | Paramètres (général, emails, sécurité, apparence) |
| `audit.view` | Consulter le journal d'audit | Journal d'audit |
| `leads.read` | Voir les leads | Leads |
| `leads.write` | Modifier les leads | Leads |
| `clients.read` | Voir les clients | Clients |
| `clients.write` | Modifier les clients | Clients |
| `projects.read` | Voir les projets | Projets |
| `projects.write` | Modifier les projets | Projets |
| `quotes.read` | Voir les devis | Devis |
| `quotes.write` | Modifier les devis | Devis |
| `invoices.read` | Voir les factures | Factures |
| `invoices.write` | Modifier les factures | Factures |
| `tasks.read` | Voir les tâches | Tâches |
| `tasks.write` | Modifier les tâches | Tâches |
| `tickets.read` | Voir les tickets | Tickets support |
| `tickets.write` | Modifier les tickets | Tickets support |
| `reports.view` | Voir les rapports | Rapports & tableau de bord (KPI sensibles) |
| `documents.read` | Voir les documents | Documents |
| `documents.write` | Gérer les documents | Documents (upload, suppression) |

> **Note :** le **Calendrier** et le **Tableau de bord** de base restent accessibles à tout utilisateur connecté au CRM. Seuls les rapports détaillés et exports sensibles passent par `reports.view`.

---

## Rôles système (déjà en place)

| Slug | Libellé | Permissions |
|------|---------|-------------|
| `admin` | Administrateur | **Toutes** (21 permissions) |
| `commercial` | Commercial | `leads.*`, `clients.*`, `quotes.*`, `tasks.*`, `reports.view`, `documents.read` |
| `project_manager` | Chef de projet | `clients.read`, `projects.*`, `tasks.*`, `tickets.*`, `reports.view`, `documents.*` |
| `readonly` | Lecture seule | Toutes les permissions `*.read` + `reports.view` (aucune écriture) |

---

## Rôles personnalisés à ajouter

Création recommandée dans l'ordre ci-dessous. Le **slug** doit être en minuscules, sans espaces (ex. `comptable`, `support_client`).

---

### 1. Directeur

**Slug :** `directeur`  
**Libellé :** Directeur  
**Profil :** Vision globale de l'activité, pilotage et contrôle — sans administration technique du CRM.

| Permission | ✓ |
|------------|---|
| `audit.view` | ✓ |
| `reports.view` | ✓ |
| `leads.read` | ✓ |
| `clients.read` | ✓ |
| `projects.read` | ✓ |
| `quotes.read` | ✓ |
| `invoices.read` | ✓ |
| `tasks.read` | ✓ |
| `tickets.read` | ✓ |
| `documents.read` | ✓ |

**Différence avec `readonly` :** accès au journal d'audit.  
**Différence avec `admin` :** pas de gestion utilisateurs, paramètres, ni modification des données.

---

### 2. Comptable

**Slug :** `comptable`  
**Libellé :** Comptable  
**Profil :** Facturation, relances, pièces comptables — pas de prospection ni de gestion de projet.

| Permission | ✓ |
|------------|---|
| `clients.read` | ✓ |
| `quotes.read` | ✓ |
| `invoices.read` | ✓ |
| `invoices.write` | ✓ |
| `reports.view` | ✓ |
| `documents.read` | ✓ |
| `documents.write` | ✓ |

---

### 3. Responsable commercial

**Slug :** `responsable_commercial`  
**Libellé :** Responsable commercial  
**Profil :** Encadrement de l'équipe commerciale — pipeline, devis, clients, sans accès facturation ni projets opérationnels.

| Permission | ✓ |
|------------|---|
| `leads.read` | ✓ |
| `leads.write` | ✓ |
| `clients.read` | ✓ |
| `clients.write` | ✓ |
| `quotes.read` | ✓ |
| `quotes.write` | ✓ |
| `tasks.read` | ✓ |
| `tasks.write` | ✓ |
| `reports.view` | ✓ |
| `documents.read` | ✓ |

**Différence avec `commercial` :** même périmètre — ce rôle sert surtout à distinguer un **manager** d'un commercial junior (voir rôle suivant). Ajuster si vous souhaitez lui donner `audit.view`.

---

### 4. Assistant commercial

**Slug :** `assistant_commercial`  
**Libellé :** Assistant commercial  
**Profil :** Qualification de leads et suivi — pas de création/modification de devis ni de fiches clients.

| Permission | ✓ |
|------------|---|
| `leads.read` | ✓ |
| `leads.write` | ✓ |
| `clients.read` | ✓ |
| `quotes.read` | ✓ |
| `tasks.read` | ✓ |
| `tasks.write` | ✓ |
| `documents.read` | ✓ |

---

### 5. Support client

**Slug :** `support_client`  
**Libellé :** Support client  
**Profil :** Gestion des tickets et relation client post-vente — lecture projets pour contexte, sans modification commerciale.

| Permission | ✓ |
|------------|---|
| `clients.read` | ✓ |
| `projects.read` | ✓ |
| `tickets.read` | ✓ |
| `tickets.write` | ✓ |
| `tasks.read` | ✓ |
| `tasks.write` | ✓ |
| `documents.read` | ✓ |

---

### 6. Designer / Développeur

**Slug :** `creatif`  
**Libellé :** Designer / Développeur  
**Profil :** Exécution sur les projets assignés — tâches, livrables, documents — sans accès devis/factures.

| Permission | ✓ |
|------------|---|
| `clients.read` | ✓ |
| `projects.read` | ✓ |
| `projects.write` | ✓ |
| `tasks.read` | ✓ |
| `tasks.write` | ✓ |
| `tickets.read` | ✓ |
| `documents.read` | ✓ |
| `documents.write` | ✓ |

**Différence avec `project_manager` :** pas de `tickets.write` obligatoire si vous préférez un profil purement production — retirer `projects.write` pour un profil **junior** (voir rôle 7).

---

### 7. Stagiaire / Alternant

**Slug :** `stagiaire`  
**Libellé :** Stagiaire  
**Profil :** Accès minimal — consultation projet et exécution de tâches assignées uniquement.

| Permission | ✓ |
|------------|---|
| `projects.read` | ✓ |
| `tasks.read` | ✓ |
| `tasks.write` | ✓ |
| `documents.read` | ✓ |

---

### 8. Responsable administratif (optionnel)

**Slug :** `resp_admin`  
**Libellé :** Responsable administratif  
**Profil :** Gestion de l'équipe CRM et des paramètres métier — sans être super-admin technique.

| Permission | ✓ |
|------------|---|
| `users.manage` | ✓ |
| `settings.manage` | ✓ |
| `audit.view` | ✓ |
| `reports.view` | ✓ |
| `leads.read` | ✓ |
| `clients.read` | ✓ |
| `projects.read` | ✓ |
| `quotes.read` | ✓ |
| `invoices.read` | ✓ |
| `tasks.read` | ✓ |
| `tickets.read` | ✓ |
| `documents.read` | ✓ |

**Usage :** alternative à `admin` pour un office manager qui configure l'équipe sans toucher aux données opérationnelles au quotidien.

---

## Matrice comparative

Légende : **R** = lecture · **W** = écriture · **—** = aucun accès · **●** = oui

| Permission | admin | commercial | chef projet | lecture seule | directeur | comptable | resp. commercial | assistant commercial | support | créatif | stagiaire | resp. admin |
|------------|:-----:|:----------:|:-----------:|:-------------:|:---------:|:---------:|:----------------:|:--------------------:|:-------:|:-------:|:---------:|:-----------:|
| `users.manage` | ● | — | — | — | — | — | — | — | — | — | — | ● |
| `settings.manage` | ● | — | — | — | — | — | — | — | — | — | — | ● |
| `audit.view` | ● | — | — | — | ● | — | — | — | — | — | — | ● |
| `leads.read` / `.write` | R/W | R/W | — | R | R | — | R/W | R/W | — | — | — | R |
| `clients.read` / `.write` | R/W | R/W | R | R | R | R | R/W | R | R | R | — | R |
| `projects.read` / `.write` | R/W | — | R/W | R | R | — | — | — | R | R/W | R | R |
| `quotes.read` / `.write` | R/W | R/W | — | R | R | R | R/W | R | — | — | — | R |
| `invoices.read` / `.write` | R/W | — | — | R | R | R/W | — | — | — | — | — | R |
| `tasks.read` / `.write` | R/W | R/W | R/W | R | R | — | R/W | R/W | R/W | R/W | R/W | R |
| `tickets.read` / `.write` | R/W | — | R/W | R | R | — | — | — | R/W | R | — | R |
| `reports.view` | ● | ● | ● | ● | ● | ● | ● | — | — | — | — | ● |
| `documents.read` / `.write` | R/W | R | R/W | R | R | R/W | R | R | R | R/W | R | R |

---

## Procédure de création

1. Aller sur **CRM → Paramètres → Équipe**.
2. Onglet **Rôles & permissions** → **Nouveau rôle**.
3. Saisir le **slug** et le **libellé** exacts du tableau ci-dessus.
4. Cocher les permissions listées pour ce rôle.
5. Enregistrer, puis assigner le rôle aux utilisateurs concernés.

---

## Recommandations SD CREATIV

| Poste typique | Rôle recommandé |
|---------------|-----------------|
| Fondateur / directeur | `admin` ou `directeur` |
| Commercial terrain | `commercial` |
| Office manager | `resp_admin` |
| Chef de projet digital | `project_manager` |
| Graphiste / dev / intégrateur | `creatif` |
| Comptabilité externe ou interne | `comptable` |
| Community manager / SAV | `support_client` |
| Stagiaire marketing | `stagiaire` |

---

## Source technique

- Permissions : `src/lib/crm-permissions.ts`
- Rôles système : `src/content/crm-roles.ts`
- API : `GET/POST /api/admin/roles`, `PATCH/DELETE /api/admin/roles/[id]`
- Interface : `src/components/admin/CrmRolesSection.tsx`

*Dernière mise à jour : juillet 2026*
