# AlphaVision Insights — What we updated (high level)

Four tracks: **(A)** general product and EA work before the workshop; **(B)** workshop Cycle 1 feedback (Phase 1 done); **(C)** still missing from workshop feedback; **(D)** planned outside the workshop (GFT, BCPNN, deployment, carbon).  

**Product rule (workshop):** AlphaVision is for **asset managers only**. A separate **data-scientist dashboard** is **not** part of this app (#7 rejected).

**Period:** roughly May 2026 (legal/EA batch, data/ops fixes, workshop Phase 1).  
**Visible in app** = user sees it on the dashboard at http://localhost:8081 without opening the repo.

---

## Full update register (last month)

| # | When | Area | What we updated | Where (main) | Visible in app? |
|---|------|------|-----------------|----------------|-----------------|
| 1 | Pre-workshop | Legal | MIT `LICENSE`, `.env.example` | repo root | No |
| 2 | Pre-workshop | Legal | Pages: Disclaimer, Terms, Privacy, About, Methodology, Licenses | `src/pages/legal/`, `src/content/legal/` | Yes — footer + routes |
| 3 | Pre-workshop | Legal | First-visit disclaimer modal | `DisclaimerAckModal`, `AppShell` | Yes — once per browser |
| 4 | Pre-workshop | Legal | Compliance strip (non-advice + link) | `ComplianceStrip` | Yes — under header |
| 5 | Pre-workshop | Legal | Site footer legal links | `SiteFooter` | Yes |
| 6 | Pre-workshop | Transparency | `ModelBadge` on VaR, news, chat, metrics | multiple `src/components/` | Yes — badges on widgets |
| 7 | Pre-workshop | Transparency | TAGLINE / legal constants | `src/constants/legal.ts` | Yes — header subtitle |
| 8 | EA gaps | Docs | `docs/ETHICAL_ASSESSMENT.md` | docs | No (repo / README) |
| 9 | EA gaps | API | `GET /api/meta` — dates + version | `backend/main.py` | Yes — via strip (dates line) |
| 10 | EA gaps | UI | Data-as-of line (prices, news, Deep VaR) | `ComplianceStrip` | Yes |
| 11 | EA gaps | Copy | Demo / illustrative LIME + methodology text | `methodology.ts`, `AssetNewsHeadlines` | Yes — “Demo XAI” |
| 12 | EA gaps | Copy | S&P 100 + diversity / coverage on About | `about.ts` | Yes — `/about` |
| 13 | EA gaps | UI | Price observation count in chart period | `AssetChart` | Yes |
| 14 | EA gaps | UI | News: article count + day lookback | `AssetNewsHeadlines`, `Index` (`selectedDays`) | Yes |
| 15 | EA gaps | Docs | `docs/PRIVACY_DEPLOYMENT.md` | docs | No |
| 16 | EA gaps | Docs | README environmental / retrain policy | `README.md` | No |
| 17 | Pre-workshop | Ops | Fast boot + `post_start.sh` (data, DeepVaR, reload) | `backend/entrypoint.sh`, `post_start.sh` | No (fresher data in charts) |
| 18 | Pre-workshop | Ops | `POST /api/admin/reload-data` + reload token | `backend/main.py`, `entrypoint.sh` | No |
| 19 | Pre-workshop | Data | News date filter + sort; DeepVaR incremental fixes | `main.py`, `deepar.py`, `data_updater.py` | Indirect — fresher news / VaR |
| 20 | Pre-workshop | Ops | `DATA_PERSISTENCE.md`, Yahoo retry env | docs, `docker-compose.yml` | No |
| 21 | Pre-workshop | Deploy | Docker Compose 8081 / 8001 | `docker-compose.yml` | Yes — when deployed |
| 22 | Pre-workshop | Repo | `.gitignore` for `files-*` scratch folders | `.gitignore` | No |
| 23 | Workshop P1 | Docs | `docs/WORKSHOP_ROADMAP.md` | docs | No |
| 24 | Workshop P1 | Docs | `docs/WHY_NOT_NEUROMORPHIC_IN_PROD.md` | docs | No |
| 25 | Workshop P1 | Docs | `docs/COMPETITIVE_NOTES.md` (TRIBE v2) | docs | No |
| 26 | Workshop P1 | Docs | `docs/PROJECT_UPDATE_SUMMARY.md` + README links | docs | No |
| 27 | Workshop P1 | API | `/api/meta` + `inference_mode`, `engines`, `neuromorphic_active`, `build_sha` | `backend/main.py`, `api.ts` | Partial — API; strip shows engine |
| 28 | Workshop P1 | UI | Engine line: classical, neuromorphic not active | `ComplianceStrip` | Yes |
| 29 | Workshop P1 | Chat | Provenance block + prompt rules (as-of, no BCPNN claims) | `gather_rag_context`, `chat_endpoint` | Partial — only if chat used |
| 30 | Workshop P1 | Copy | About: AM-only; DS dashboards elsewhere | `about.ts` | Yes — `/about` |

**Not done last month:** CodeCarbon; GFT drift / adversarial / data-poisoning tests; BCPNN integration; scenario simulation; audit export; production LIME; KYC / AML / federated learning; second data-scientist dashboard in this app.

### Workshop Phase 1 — what it means in the app

| Summary item | Register rows | What you actually get |
|--------------|---------------|------------------------|
| Positioning docs | 23–26 | Three markdown files in repo + README links (not new screens) |
| Engine visibility | 27–28 | Extra `/api/meta` fields + gray line under compliance strip |
| Chat provenance | 29 | Backend adds dates/rules to chat context (same chat UI; needs `OPENAI_API_KEY`) |
| About AM vs DS | 30 | One bullet on `/about` (no second dashboard built) |

---

## Workshop requirements (Cycle 1) — covered or not?

Co-creation workshop, **27 March 2026** — Use Case 2 (neuromorphic cognitive financial services). Full mapping: [WORKSHOP_ROADMAP.md](./WORKSHOP_ROADMAP.md).

| # | Workshop requirement | Needed for AlphaVision? | Covered? | Notes |
|---|----------------------|-------------------------|----------|--------|
| 1 | Scenario simulation (what-if weights, bull/bear/stress) | Yes | **Partial** | Portfolio + VaR exist; no scenario presets |
| 2 | Portfolio recommendations from risk profile (chat) | Yes (guarded) | **Partial** | Chat + portfolio context; no risk-profile UI or formal recommendations |
| 3 | KYC integration | No (other product) | **N/A** | Not in scope for this dashboard |
| 4 | Anomaly / fraud / AML (BCPNN) | No (separate use-case) | **Not covered** | Future parallel app |
| 5 | Confidence-distribution VaR (BCPNN) | No until BCPNN exists | **Not covered** | Still parametric / Monte Carlo / DeepAR |
| 6 | Hybrid architecture + DORA fallback visible | Partial | **Partial** | `inference_mode: classical` + strip; no real hybrid switch |
| 7 | Split dashboard: AM vs data scientist | No | **N/A (by design)** | AV = AM only; DS tools are separate — not a second view here |
| 8 | BCPNN-native explainability (Orfeas + KTH) | No (current stack) | **Not covered** | Demo LIME only |
| 9 | Chat answer-level “why” (traceable VaR/sentiment) | Yes | **Partial** | Backend provenance + prompt; no structured explain UI |
| 10 | Regulator audit trail / DORA–AI Act export | Partial | **Partial** | Meta, legal, privacy checklist; no export bundle |
| 11 | Why neuromorphic isn’t in production finance | Yes | **Covered** | [WHY_NOT_NEUROMORPHIC_IN_PROD.md](./WHY_NOT_NEUROMORPHIC_IN_PROD.md) |
| 12 | Stress-test / sandbox-pilot evidence | Yes | **Partial** | Kupiec / backtests in UI; no formal sandbox pack |
| 13 | Independent third-party model review | Yes (program) | **Not covered** | Process milestone — not implemented in code |
| 14 | Position vs Meta TRIBE v2 | Yes | **Covered** | [COMPETITIVE_NOTES.md](./COMPETITIVE_NOTES.md) |
| 15 | Federated learning first-class | No (AV v1) | **Not covered** | Acknowledged in privacy docs only |

### Workshop coverage summary

| Status | Count | Items |
|--------|-------|--------|
| **Covered** | 2 | #11, #14 |
| **Partial** | 6 | #1, #2, #6, #9, #10, #12 |
| **Not covered** | 5 | #4, #5, #8, #13, #15 |
| **N/A** | 2 | #3, #7 |

---

## A. Completed before workshop feedback

### Legal, open source, and AI transparency (dashboard)

- MIT `LICENSE`, `.env.example`, README legal / ethical sections  
- Legal routes: `/disclaimer`, `/terms`, `/privacy`, `/about`, `/methodology`, `/licenses`  
- First-visit disclaimer modal (`localStorage`), compliance strip, site footer  
- `ModelBadge` on VaR charts, news, chat, metrics (ML vs statistical vs AI labels)  
- Shared copy: `src/constants/legal.ts`, `src/constants/modelLabels.ts`, `src/content/legal/*`  

### Implement easy EA gaps (excluded CodeCarbon and GFT adversarial/drift work)

1. **`docs/ETHICAL_ASSESSMENT.md`** — EU-style principles table, GFT deferrals noted  
2. **`GET /api/meta`** — `prices_as_of`, `news_as_of`, `deepvar_as_of`, `version`  
3. **Dashboard data-as-of** — shown in `ComplianceStrip` (not header)  
4. **`methodology.ts` + `AssetNewsHeadlines`** — LIME/XAI labeled **illustrative / demo**; button **Demo XAI**  
5. **`about.ts`** — S&P 100 scope and **diversity / coverage** paragraph  
6. **`AssetChart` + `AssetNewsHeadlines`** — price observation count in period; news `{n} articles · {days}-day lookback`  
7. **`docs/PRIVACY_DEPLOYMENT.md`** — operator checklist (chat, logs, third parties)  
8. **README** — environmental / retrain policy pointer (`post_start`, incremental DeepVaR; carbon **planned**, not implemented)  

**Explicitly not done in this tranche:** CodeCarbon; adversarial tests; automated drift monitoring (assigned to **GFT**, next period).

### Data, risk engine, and deployment (engineering, pre-workshop)

- Fast API boot + background **`post_start.sh`** (data update, DeepVaR, reload into memory)  
- **`POST /api/admin/reload-data`** + ephemeral reload token in Docker entrypoint  
- News freshness (`days` filter, date sort); incremental **DeepVaR** backtest fixes  
- Yahoo retry env vars; `backend/DATA_PERSISTENCE.md`  
- Docker Compose: frontend **8081**, API **8001**  
- `.gitignore` for local scratch `files-*` folders  

---

## B. Completed from workshop feedback (Phase 1)

**Goal:** Align with Cycle 1 co-creation (27 Mar 2026) **without** changing VaR math, portfolio logic, charts, or data pipelines.

### Documentation

1. **`docs/WORKSHOP_ROADMAP.md`** — 15 workshop items: needed / not needed / phase; AM-only boundary  
2. **`docs/WHY_NOT_NEUROMORPHIC_IN_PROD.md`** — positioning (#11)  
3. **`docs/COMPETITIVE_NOTES.md`** — vs Meta TRIBE v2 (#14)  
4. **README + `ETHICAL_ASSESSMENT.md`** — links and Mar 2026 workshop note  

### Minimal additive code

5. **`/api/meta` extended** — `inference_mode: classical`, `engines`, `neuromorphic_active: false`, optional `build_sha` (#6 visibility)  
6. **Compliance strip** — second line: classical engine active; neuromorphic **not** active  
7. **Risk chatbot (backend only)** — prepend **DATA PROVENANCE** to RAG context; extra prompt rules to cite as-of dates and not claim BCPNN (#9 MVP)  
8. **`about.ts`** — built for asset managers; DS tools are **separate dashboards** (reinforces #7 = N/A)  

**Not done in workshop Phase 1 (by design):** scenario simulation; portfolio recommendations UI; audit export; real LIME; second DS view; KYC; AML; BCPNN VaR; federated learning.

---

## C. Still missing — from workshop feedback

| Workshop theme | Examples | Phase |
|----------------|----------|--------|
| **Features** | Scenario what-if / stress (#1); risk-profile portfolio suggestions (#2, needs legal) | Phase 2 |
| **Explainability** | Production LIME/SHAP (replace mock API); structured “explain this VaR” in chat (#9 full) | Phase 2 |
| **Governance** | Regulator audit export DORA / AI Act (#10) | Phase 2 |
| **Validation** | Sandbox / stress-test evidence pack (#12); third-party model review scheduled (#13) | GFT + program |
| **Research / other products** | BCPNN distribution VaR (#5); AML/fraud (#4); KYC (#3); BCPNN-native XAI (#8); federated learning (#15) | Use Case 2 / separate |
| **Rejected for AV** | Split AM + data-scientist dashboard (#7) | N/A — DS tools elsewhere |
| **Energy** | CodeCarbon / published kgCO₂e | Mentioned in README; **not built** |

---

## D. Still missing — outside workshop (general / GFT / roadmap)

These were planned **before or parallel** to the workshop, not delivered in EA or workshop Phase 1.

### GFT (next period — ethical assessment “High” priority)

- Model **drift** monitoring and alerts  
- **Adversarial** robustness testing (news text, chat prompts)  
- **Data-poisoning** threat model and mitigations  
- *(Workshop #12 sandbox evidence can overlap with this track.)*

### BCPNN / neuromorphic (Use Case 2 — Pawel/Giorgio / KTH)

- Integrate **BCPNN** confidence-distribution VaR (replace or complement Monte Carlo)  
- **Hybrid** classical fallback under DORA Art. 25 — real switching, not only `inference_mode: classical` in meta  
- AML / fraud / anomaly mini use-case (#4)  
- Neuromorphic intrinsic explainability (#8)  
- Neuromorphic pilot benchmarks (energy, latency)  

### Deployment and product hardening

- **`build_sha` / git commit** in Docker images (meta field exists; often `null` today)  
- **Lawyer review** of template legal copy before public launch  
- **FinBERT vs keyword fallback** flag in `/api/meta`  
- Structured **audit logging** (reload, optional chat) for institutional use  
- Sector-level **fairness** monitoring report (offline)  
- Asset-manager **one-pager** / simplified summary (not a DS dashboard)  

### Carbon (EA + workshop energy theme)

- **CodeCarbon** (or equivalent) on train/incremental DeepVaR — **explicitly excluded** from EA easy gaps and workshop Phase 1  

---

## At a glance

| Track | Status |
|-------|--------|
| **A. Pre-workshop** (legal + EA gaps 1–8 + ops) | **Done** |
| **B. Workshop Phase 1** (docs + meta engine + chat provenance) | **Done** |
| **C. Workshop Phase 2+** | **Not started** (scenarios, audit export, real XAI, etc.) |
| **D. GFT / BCPNN / carbon / hardening** | **Not started** (in backlog) |

**Test deployed stack:** `docker compose up -d` → http://localhost:8081 · `curl http://localhost:8001/api/meta`

**Detail:** [Workshop roadmap](./WORKSHOP_ROADMAP.md) · [Ethical assessment](./ETHICAL_ASSESSMENT.md) · [Privacy checklist](./PRIVACY_DEPLOYMENT.md)
