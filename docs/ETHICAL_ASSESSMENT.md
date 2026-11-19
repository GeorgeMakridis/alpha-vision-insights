# Ethical Assessment — AlphaVision Insights

This document tracks alignment with EU-style trustworthy AI principles for the open-source S&P 100 risk dashboard. It is an **engineering template** for internal Extra Brain / EA review—not legal advice.

**Assessment dates:** 05 Sep 2024; updated 03 Nov 2025; **21 May 2026** (legal UX, provenance API, transparency labels); **Cycle 1 workshop Mar 2026** (roadmap docs, inference_mode, chat provenance); **18 Jul 2026** (chat privacy: OpenAI named, no-PII warnings, contact email, controller wording); **22 Oct 2026** (Gabriela / HLEG clarification: system-in-context trustworthiness; GDPR hosting & third-party checklist).

**Deferred to GFT (next period):** model drift monitoring; adversarial robustness testing; data-poisoning risk assessment; privacy leakage tests (membership inference / training-data extraction) where applicable.

Related: [Workshop roadmap](./WORKSHOP_ROADMAP.md) · [Privacy deployment checklist](./PRIVACY_DEPLOYMENT.md) · [README](../README.md) · In-app legal routes (`/disclaimer`, `/privacy`, `/methodology`, `/about`).

---

## HLEG Trustworthy AI (Oct 2026 clarification)

Per the EU HLEG Trustworthy AI Guidelines (and ALTAI):

1. **Trustworthiness is not only technical properties of a model.** It concerns the AI **system in its overall context of use** — people, data, how the system is used, organisational arrangements, and potential impact.
2. The **seven requirements** must be assessed in a way **tailored to the use case**. Human oversight and accountability depend on organisational arrangements as well as model behaviour.
3. **Model-level evidence** (robustness / reliability testing, known failure modes, privacy tests where relevant) is a **meaningful part** of the overall assessment, but **does not** justify claiming that a model is **unconditionally trustworthy** regardless of deployment and use.
4. AlphaVision therefore: documents model-level properties that **support** trustworthiness; states limitations (volatility scaling, grid edges, generative chat errors); and **does not** claim unconditional trustworthiness in UI or partner materials.

**Use case for this assessment:** research / educational exploration of S&P 100 risk metrics and news context — **not** automated trading or regulated advice.

---

## Chatbot ethical / legal check (Jul 2026)

| Topic | Status for Extra Brain / UNP demo |
|-------|-----------------------------------|
| LLM provider | **OpenAI** Chat Completions (`api.openai.com`) when `OPENAI_API_KEY` is set |
| Prompt / response storage | **Not persisted** by AlphaVision app code; processed by OpenAI per their terms; host/proxy may keep access logs |
| Private data | UI + `/privacy` instruct users **not** to share personal, private, or account data |
| Controller / contact | Self-host = operator; demo privacy contact: **george.makridis@expertai-lux.com** |
| Safeguards | Optional chat (disable by omitting key); TLS on public demo; PII warnings; operator checklist in [PRIVACY_DEPLOYMENT.md](./PRIVACY_DEPLOYMENT.md) |
| International transfers | OpenAI may process outside the EEA — operator must review DPA / ToS / Privacy Policy before EU user access |

---

## Assessment matrix (HLEG seven requirements)

| Ethical principle (HLEG) | Prioritization | Benchmarks / metrics | Explainability aspect | Comments / next steps |
|--------------------------|----------------|----------------------|------------------------|------------------------|
| **Human agency and oversight** | Low | Human-in-the-loop; information only; no automated trading; user controls ticker, period, portfolio | First-visit disclaimer modal; compliance strip; TAGLINE; `/disclaimer`, `/terms`; ModelBadge on AI/model outputs | System does not make automated decisions—only provides information. Human advisors retain full decision-making authority. No automated trading. **Implemented:** advisory-only legal UX + HLEG “context of use” wording. **Next:** lawyer review of template legal copy before public demo. |
| **Technical robustness and safety** | High | Model accuracy; error detection; backtesting in UI; data freshness (reload / post_start); partner OOS (BCPNN pooled coverage vs per-ticker / volatility gaps) | `/methodology`; Kupiec table; breach stats; ML vs statistical badges; API `warnings` when grid-edge | Continue robust monitoring. **DeepVaR motivation:** address incomplete **volatility scaling** seen in partner VaR OOS (higher 99% violations on more volatile names). **GFT next period:** adversarial testing, drift alerts. **Now:** Yahoo retries, admin reload, stale-data fixes in README. |
| **Privacy and data governance** | Medium *(if hosted chat / XAI / partner APIs)* | Public market data; chat/XAI may leave host; no app-side chat store; localStorage ack only | `/privacy` (hosting, transfers, third parties); RiskChatbot OpenAI + no-PII warning | **Jul–Oct 2026:** privacy names controllers, third parties, EEA transfers, research ≠ GDPR exemption; [PRIVACY_DEPLOYMENT.md](./PRIVACY_DEPLOYMENT.md) Gabriela checklist. **Next:** confirm OpenAI DPA + partner VaR host DPA with host org. |
| **Transparency** | High | XAI; backtesting; methodology for asset managers | AM-facing badges, `/methodology`, backtests; DS use separate dashboards | **Implemented:** methodology, model badges, backtest tables, `/api/meta`, data-as-of strip. **Next:** surface partner VaR `warnings`; AM feedback. |
| **Diversity and fairness** | Low | FinBERT corpus; article counts and lookback in UI; S&P 100 scope stated | About scope; news count per ticker | **Implemented:** observation count in chart, lookback in news, diversity section in About. **Next:** sector coverage monitoring (offline). |
| **Societal and environmental well-being** | Medium | kgCO₂e train/retrain; energy per inference; retrain frequency | Methodology / README retrain policy | Track/publish carbon estimates when available. **Now:** incremental DeepVaR via `post_start.sh` documented in README. **Next:** CodeCarbon on train/incremental (not in current release). |
| **Accountability** | Low | Advisors/investors decide; AI is a tool; traceability | Legal pages; API provenance (`/api/meta`); partner protocol disclosures | Maintain modularity, logging, EA board. **Implemented:** `prices_as_of`, `news_as_of`, `deepvar_as_of`, `llm_provider` / `chat_configured` in `/api/meta`. **Next:** git/build SHA in meta if needed; structured audit logs for institutional use. |

---

## GFT handoff (next period)

- Model drift monitoring and alerting
- Adversarial robustness testing (inputs, prompts, news text)
- Data-poisoning threat model and mitigations for news/price pipelines
- Where proportionate: privacy leakage tests (membership inference / extraction) on models that memorise training text

---

## In-app evidence (May 2026 + workshop Phase 1 + Oct 2026)

- Legal routes and content under `src/content/legal/` (privacy hosting/transfers; disclaimer HLEG section; methodology Trustworthy AI + BCPNN/DeepVaR notes)
- `ComplianceStrip` + `DisclaimerAckModal` + `ModelBadge`
- `GET /api/meta` for data provenance timestamps and `inference_mode`
- Workshop docs: [WORKSHOP_ROADMAP.md](./WORKSHOP_ROADMAP.md), [WHY_NOT_NEUROMORPHIC_IN_PROD.md](./WHY_NOT_NEUROMORPHIC_IN_PROD.md)
