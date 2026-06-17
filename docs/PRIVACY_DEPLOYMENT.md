# Privacy deployment checklist (operators)

Use this checklist when self-hosting or operating a public demo of AlphaVision Insights. End-user-facing policy text lives at `/privacy` (from `src/content/legal/privacy.ts`).

## Before go-live

- [ ] **Environment file** — Run `./scripts/setup-env.sh` (or `cp .env.example .env`) and set secrets; see [README](../README.md#2-configure-environment).
- [ ] **Data controller identified** — You (self-host) or your organization (public demo), not the open-source repo maintainers by default.
- [ ] **Contact email set** — `VITE_CONTACT_EMAIL` in `.env` (baked into frontend at Docker build) for Privacy / legal links.
- [ ] **Secrets not in git** — `.env` contains API keys only on the server; never commit `.env`.

## Chat (OpenAI or compatible LLM)

- [ ] **`OPENAI_API_KEY`** — Only set if chat is required; disable by omitting the key if chat should be unavailable.
- [ ] **No PII in prompts** — UI warns users; operator policy forbids account numbers, national IDs, etc.
- [ ] **Message logging** — Document whether chat requests/responses are logged on your server (default: not long-term stored by app code; verify your deployment).
- [ ] **Retention** — Define how long logs are kept if logging is enabled.
- [ ] **Sub-processor** — OpenAI (or chosen provider) DPA / terms reviewed if EU/UK users access the instance.

## Server and network

- [ ] **Access logs** — IP, user-agent, timestamps may be recorded by reverse proxy or hosting provider.
- [ ] **Log retention** — Set rotation and deletion (e.g. 30–90 days).
- [ ] **TLS** — HTTPS in production for frontend and API.
- [ ] **Admin reload token** — `INTERNAL_RELOAD_TOKEN` is a secret; do not expose port 8000/8001 to untrusted networks without controls.

## Browser / client

- [ ] **localStorage** — Disclaimer acknowledgment flag (`disclaimer_ack_v1`); no account data by default.
- [ ] **Cookies** — None required for core dashboard; add cookie banner only if analytics cookies are introduced later.

## Third-party data and models

- [ ] **Finnhub** — `FINNHUB_API_KEY` required for news; subject to [Finnhub terms](https://finnhub.io/terms-of-service).
- [ ] **External XAI** — If `XAI_USE_MOCK=false`, `XAI_API_URL` sends headline title/content to your service; document sub-processor and retention.
- [ ] **Yahoo Finance (yfinance)** — Historical prices; subject to Yahoo terms; may fail from some networks.
- [ ] **Hugging Face** — FinBERT download; `HF_TOKEN` optional; cache directory (`HF_HOME`) on persistent volume if used.

## Data on disk

- [ ] **Market files** — `backend/data/sp100_daily_prices.csv`, `news_sentiment_updated.json` contain public market/news data, not end-user PII.
- [ ] **Backups** — Volume backups may copy the above; secure backup storage.
- [ ] **Data subject requests** — Process access/deletion requests for any logs you store; market files generally do not contain user PII.

## Review cadence

- [ ] Re-run this checklist after enabling chat, analytics, or auth.
- [ ] Re-read `/privacy` after material feature changes.
- [ ] Have qualified counsel review template legal copy before a regulated or commercial launch.

## References

- [`.env.example`](../.env.example) — full variable list (Finnhub, XAI, OpenAI, scheduler, Vite)
- [`scripts/setup-env.sh`](../scripts/setup-env.sh) — create `.env` and generate `INTERNAL_RELOAD_TOKEN`
- [Ethical assessment](./ETHICAL_ASSESSMENT.md)
- In-app: `/privacy`, `/terms`, `/disclaimer`
