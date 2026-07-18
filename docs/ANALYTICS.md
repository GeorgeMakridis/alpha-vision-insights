# Visitor analytics (Umami / Plausible)

Optional, privacy-friendly page-view tracking. **Off by default.** No new Kubernetes services for Miguel if you use a cloud plan.

## Recommended: Umami Cloud (lowest effort)

**You (George) — one-time setup (~5 min)**

1. Sign up at [https://cloud.umami.is](https://cloud.umami.is) (free tier is enough for a demo).
2. Add a website with domain: `alphavision.extra-brain.unparallel.pt`
3. Copy the **Website ID** (UUID) and note the script URL (usually `https://cloud.umami.is/script.js`).

**Miguel — only env + frontend rebuild**

Add to the frontend build env (same place as `VITE_API_URL` / `VITE_CONTACT_EMAIL`):

```bash
VITE_ANALYTICS_PROVIDER=umami
VITE_ANALYTICS_SCRIPT_URL=https://cloud.umami.is/script.js
VITE_ANALYTICS_WEBSITE_ID=<paste-uuid-from-umami>
```

Rebuild **only** the frontend image (no backend change, no PVC, no new pods):

```bash
docker compose build --no-cache alphavision-frontend
docker compose up -d alphavision-frontend
```

(or the equivalent K8s image rebuild with those build args)

Then open the live site once and confirm a hit appears in the Umami dashboard.

## Alternative: Plausible Cloud

Plausible is paid SaaS. Same pattern for Miguel (env + rebuild only):

```bash
VITE_ANALYTICS_PROVIDER=plausible
VITE_ANALYTICS_SCRIPT_URL=https://plausible.io/js/script.js
VITE_ANALYTICS_DOMAIN=alphavision.extra-brain.unparallel.pt
```

## What Miguel does *not* need

- No Umami/Plausible container in the cluster  
- No database for analytics  
- No Ingress changes (script loads from `cloud.umami.is` / `plausible.io` in the browser)  
- No cookie consent banner for default Umami/Plausible cookieless mode (still disclose in `/privacy` — already updated)

## Local development

Leave `VITE_ANALYTICS_*` empty — the script never loads.

## Privacy

See `/privacy` and [PRIVACY_DEPLOYMENT.md](./PRIVACY_DEPLOYMENT.md). Tell Gabriela that analytics (if enabled) is Umami/Plausible cookieless page views only.
