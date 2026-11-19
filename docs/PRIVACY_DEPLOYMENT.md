# Privacy deployment checklist (operators)

Use this checklist when self-hosting or operating a public demo of AlphaVision Insights. End-user-facing policy text lives at `/privacy` (from `src/content/legal/privacy.ts`).

Research projects are **not** exempt from GDPR. Even when market datasets contain no personal data, integrated services may process **user-related** information (logs, chat, analytics).

## Gabriela / consortium questions (answer per deployment)

Document answers before external demos or post-project hosting:

1. **What data** is collected, processed, stored or shared (including user inputs and logs)?
2. **Where** are the servers located, and **who** operates and controls them?
3. Are **external cloud / AI** providers involved? Have ToS, Privacy Policies, and DPAs been reviewed?
4. Could **personal / user-related data** be transferred to external providers, including **outside the EEA**?

| Area | Typical AlphaVision answer (confirm for *your* host) |
|------|------------------------------------------------------|
| Market files | Prices / news JSON on operator disk — public market data, not end-user PII |
| Access logs | Reverse proxy / host may store IP, UA, timestamps |
| Chat | User message + non-personal dashboard context → **OpenAI** (`api.openai.com`) if enabled |
| XAI | Headline title/content → `XAI_API_URL` host; optional narrative → OpenAI |
| Partner VaR | Daily returns vector → partner API (KTH / UNP / other) when wired |
| Analytics | Optional Umami/Plausible — page URL / referrer / coarse device info |
| Server control | Extra Brain / UNP demo or self-host — **name the operator and region** |

## Before go-live

- [ ] **Environment file** — Run `./scripts/setup-env.sh` (or `cp .env.example .env`) and set secrets; see [README](../README.md#2-configure-environment).
- [ ] **Data controller identified** — Self-host: you are the controller. Public Extra Brain / UNP demo: privacy contact `george.makridis@expertai-lux.com`; host operator remains responsible for the server.
- [ ] **Server location & operator named** — Record region (EEA / other) and admin organisation for this instance.
- [ ] **Contact email set** — `VITE_CONTACT_EMAIL=george.makridis@expertai-lux.com` (baked into frontend at Docker build) for Privacy / legal links. Rebuild frontend after changing.
- [ ] **Secrets not in git** — `.env` contains API keys only on the server; never commit `.env`.

## Chat (OpenAI) — short ethical / legal check

- [ ] **LLM provider** — This deployment uses **OpenAI** (`api.openai.com`) when `OPENAI_API_KEY` is set. Confirm that matches your DPA / sub-processor list.
- [ ] **`OPENAI_API_KEY`** — Only set if chat is required; omit the key to disable chat entirely.
- [ ] **No private / personal data in prompts** — UI and `/privacy` warn users; operator policy forbids passwords, account numbers, national IDs, customer PII.
- [ ] **Storage** — AlphaVision app code does **not** persist chat transcripts by default. OpenAI processes each request under OpenAI’s terms. Document any extra logging you enable (proxy, APM).
- [ ] **Retention** — Define how long reverse-proxy / access logs are kept (e.g. 30–90 days).
- [ ] **Sub-processor / transfers** — OpenAI DPA, Privacy Policy, and ToS reviewed; transfer mechanism documented if EU/UK users access the instance (likely processing outside the EEA).
- [ ] **TLS** — HTTPS for the public demo (frontend and API via reverse proxy).

## Server and network

- [ ] **Access logs** — IP, user-agent, timestamps may be recorded by reverse proxy or hosting provider.
- [ ] **Log retention** — Set rotation and deletion (e.g. 30–90 days).
- [ ] **TLS** — HTTPS in production for frontend and API.
- [ ] **Admin reload token** — `INTERNAL_RELOAD_TOKEN` is a secret; do not expose port 8000/8001 to untrusted networks without controls.

## Browser / client

- [ ] **localStorage** — Disclaimer acknowledgment flag (`disclaimer_ack_v1`); no account data by default.
- [ ] **Cookies** — None required for core dashboard; Umami/Plausible defaults are cookieless. Add a cookie banner only if you introduce cookie-based analytics later.
- [ ] **Visitor analytics (optional)** — Prefer Umami Cloud ([docs/ANALYTICS.md](./ANALYTICS.md)); set `VITE_ANALYTICS_*` and rebuild frontend. Disclose in `/privacy`.

## Third-party data and models

- [ ] **Finnhub** — `FINNHUB_API_KEY` required for news; subject to [Finnhub terms](https://finnhub.io/terms-of-service).
- [ ] **External XAI** — If `XAI_USE_MOCK=false`, `XAI_API_URL` sends headline title/content to your service; document sub-processor, location, and retention.
- [ ] **Partner VaR (BCPNN etc.)** — If AlphaVision calls an external `/calculate-var` host, document operator (KTH / UNP / other), region, auth (`X-API-Key`), retention of return vectors, and DPA if personal data could appear in logs.
- [ ] **Yahoo Finance (yfinance)** — Historical prices; subject to Yahoo terms; may fail from some networks.
- [ ] **Hugging Face** — FinBERT download; `HF_TOKEN` optional; cache directory (`HF_HOME`) on persistent volume if used.

## Data on disk

- [ ] **Market files** — `backend/data/sp100_daily_prices.csv`, `news_sentiment_updated.json` contain public market/news data, not end-user PII.
- [ ] **Backups** — Volume backups may copy the above; secure backup storage.
- [ ] **Data subject requests** — Process access/deletion requests for any logs you store; market files generally do not contain user PII.

## Review cadence

- [ ] Re-run this checklist after enabling chat, analytics, auth, XAI, or partner VaR.
- [ ] Re-read `/privacy` after material feature changes.
- [ ] Have qualified counsel review template legal copy before a regulated or commercial launch.
- [ ] Treat the chatbot as requiring a short ethical/legal check before external demo review (provider, storage, controller, safeguards, EEA transfers).

## References

- [`.env.example`](../.env.example) — full variable list (Finnhub, XAI, OpenAI, scheduler, Vite)
- [`scripts/setup-env.sh`](../scripts/setup-env.sh) — create `.env` and generate `INTERNAL_RELOAD_TOKEN`
- [Ethical assessment](./ETHICAL_ASSESSMENT.md) — HLEG / ALTAI framing
- In-app: `/privacy`, `/terms`, `/disclaimer`, `/methodology`, `/about`
