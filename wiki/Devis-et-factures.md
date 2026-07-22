# Devis & factures

Catalogue, devis, signature, factures et paiements.

[[← Accueil|Home]]

### Catalogue prestations

> Référentiel de lignes pour composer les devis.

**Explication**

Évite de retaper les prestations ; alimente le configurateur et les devis CRM.

**Fonctionnement**

Catalogue → ajouter / éditer des prestations → les sélectionner dans un devis.

**Lien :** [/admin/crm/catalogue](https://sdcreativ.com/admin/crm/catalogue)

**Captures**

![Catalogue prestations — catalogue.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/catalogue.png)

---

### Devis

> Création, envoi, suivi et signature des devis.

**Explication**

Cycle de vie complet : brouillon → envoyé → vu / relance / négociation → signé / facturé. Multi-devises et PDF A4 avec logo.

**Fonctionnement**

Devis → créer / importer → publier / envoyer → suivre le statut → signature client → générer facture si besoin.

**Lien :** [/admin/crm/devis](https://sdcreativ.com/admin/crm/devis)

**Captures**

![Devis — devis.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/devis.png)

---

### PDF devis (logo & Chromium) · _Récent_

> PDF A4 réel avec identité société embarquée.

**Explication**

Génération via Playwright/Chromium dans Docker ; logo et mentions société cohérents avec les paramètres.

**Fonctionnement**

Depuis un devis → aperçu / télécharger PDF. En prod, smokes post-deploy vérifient la chaîne PDF.

**Lien :** [/admin/crm/devis](https://sdcreativ.com/admin/crm/devis)

**Captures**

![PDF devis (logo & Chromium) — devis.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/devis.png)

---

### Signature devis (OTP / audit) · _Récent_

> Signature électronique SD CREATIV v2.

**Explication**

Parcours sécurisé (OTP), journal d’audit ; le lead lié passe en Signé.

**Fonctionnement**

Client reçoit le lien de signature → OTP → signe. Le CRM met à jour devis + lead.

**Lien :** [/admin/crm/devis](https://sdcreativ.com/admin/crm/devis)

**Captures**

![Signature devis (OTP / audit) — devis.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/devis.png)

---

### Multi-devises · _Récent_

> Devis et factures avec devise et taux de change.

**Explication**

Gère FCFA / autres devises sans figer uniquement l’affichage public.

**Fonctionnement**

À la création du devis/facture → choisir la devise / taux → montants convertis selon la config.

**Lien :** [/admin/crm/devis](https://sdcreativ.com/admin/crm/devis)

**Captures**

![Multi-devises — devis.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/devis.png)

![Multi-devises — factures.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/factures.png)

---

### Factures & CinetPay · _Récent_

> Facturation, PDF, email avec pièce jointe, paiement en ligne.

**Explication**

Workflow devis → facture, identité dynamique sur PDF, paiement CinetPay pour le client.

**Fonctionnement**

Factures (ou depuis un devis signé) → générer → envoyer (PDF joint) → suivre le paiement CinetPay / marquage payé.

**Lien :** [/admin/crm/factures](https://sdcreativ.com/admin/crm/factures)

**Captures**

![Factures & CinetPay — factures.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/factures.png)

![Factures & CinetPay — factures_02.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/factures_02.png)

---

### Identité emails (chrome) · _Récent_

> Logo et société sur tous les emails CRM.

**Explication**

En-tête / pied d’email homogènes, éditables dans les paramètres.

**Fonctionnement**

Paramètres → identité / templates email → modifier logo & mentions → tester un envoi.

**Lien :** [/admin/crm/parametres](https://sdcreativ.com/admin/crm/parametres)

**Captures**

![Identité emails (chrome) — parametres-email.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/parametres-email.png)

![Identité emails (chrome) — parametres-email_02.png](https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs/parametres-email_02.png)

---

