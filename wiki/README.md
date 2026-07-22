# Publier sur GitHub Wiki

```bash
node scripts/generate-crm-wiki.mjs
# Activer le Wiki dans GitHub → Settings → Features → Wikis
git clone git@github.com:sdcreativ/sdcreativ.wiki.git /tmp/sdcreativ.wiki
rsync -a --delete --exclude .git wiki/ /tmp/sdcreativ.wiki/
cd /tmp/sdcreativ.wiki
git add -A && git commit -m "docs: sync wiki CRM" && git push
```
