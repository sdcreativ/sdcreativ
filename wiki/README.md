# Publier sur GitHub Wiki

Source de vérité : fiches **publiées** du CMS CRM (`crm_doc_pages`).

## Depuis le CRM (recommandé)

1. Dans `.env.docker` :
   ```bash
   CRM_WIKI_PUBLISH_ENABLED=1
   CRM_WIKI_GIT_URL=https://x-access-token:GITHUB_TOKEN@github.com/sdcreativ/sdcreativ.wiki.git
   ```
2. Redémarrer le conteneur `app`
3. Admin → Documentation → **Publier le wiki**

Sans push configuré, le bouton régénère quand même le dossier `wiki/` localement.

## En CLI (fallback catalogue)

```bash
node scripts/generate-crm-wiki.mjs
# Activer le Wiki dans GitHub → Settings → Features → Wikis
git clone git@github.com:sdcreativ/sdcreativ.wiki.git /tmp/sdcreativ.wiki
rsync -a --delete --exclude .git wiki/ /tmp/sdcreativ.wiki/
cd /tmp/sdcreativ.wiki
git add -A && git commit -m "docs: sync wiki CRM" && git push
```
