# Visitor analytics (Umami / Plausible)

Privacy-friendly page-view tracking. **Umami Cloud is enabled by default** for the Extra Brain / UNP demo (website ID baked into the frontend).

## Defaults in the repo

| Variable | Default |
|----------|---------|
| `VITE_ANALYTICS_PROVIDER` | `umami` |
| `VITE_ANALYTICS_SCRIPT_URL` | `https://cloud.umami.is/script.js` |
| `VITE_ANALYTICS_WEBSITE_ID` | `f6455d9b-acb4-40d7-9aa4-b880867e7ed8` |

Miguel only needs to **pull + rebuild the frontend** — no extra env required for Umami.

To disable: set `VITE_ANALYTICS_PROVIDER=off` at frontend build time.

## What Miguel does *not* need

- No Umami/Plausible container in the cluster  
- No database for analytics  
- No Ingress changes (script loads from `cloud.umami.is` in the browser)  

## Alternative: Plausible Cloud

```bash
VITE_ANALYTICS_PROVIDER=plausible
VITE_ANALYTICS_SCRIPT_URL=https://plausible.io/js/script.js
VITE_ANALYTICS_DOMAIN=alphavision.extra-brain.unparallel.pt
```

## Privacy

See `/privacy` and [PRIVACY_DEPLOYMENT.md](./PRIVACY_DEPLOYMENT.md). Umami is cookieless by default (page views / unique visitors for the research demo).
