# Ethical Assessment — AlphaVision Insights

This document tracks alignment with EU-style trustworthy AI principles for the open-source S&P 100 risk dashboard. It is an **engineering template** for internal EA review—not legal advice.

**Assessment dates:** 05 Sep 2024; updated 03 Nov 2025; **21 May 2026** (legal UX, provenance API, transparency labels); **Cycle 1 workshop Mar 2026** (roadmap docs, inference_mode, chat provenance).

**Deferred to GFT (next period):** model drift monitoring; adversarial robustness testing; data-poisoning risk assessment.

Related: [Workshop roadmap](./WORKSHOP_ROADMAP.md) · [Privacy deployment checklist](./PRIVACY_DEPLOYMENT.md) · [README](../README.md) · In-app legal routes (`/disclaimer`, `/privacy`, `/methodology`, `/about`).

---

## Assessment matrix

| Ethical principle | Prioritization | Benchmarks / metrics | Explainability aspect | Comments / next steps |
|-------------------|----------------|----------------------|------------------------|------------------------|
| **Human agency and oversight** | Low | Human-in-the-loop; information only; no automated trading; user controls ticker, period, portfolio | First-visit disclaimer modal; compliance strip; TAGLINE; `/disclaimer`, `/terms`; ModelBadge on AI/model outputs | System does not make automated decisions—only provides information. Human advisors retain full decision-making authority. No automated trading. **Implemented:** advisory-only legal UX. **Next:** lawyer review of template legal copy before public demo; optional hard API gate if EA requires. |
| **Technical robustness and safety** | High | Model accuracy; error detection; backtesting in UI; data freshness (reload / post_start) | `/methodology`; Kupiec table; breach stats; ML vs statistical badges | Continue robust monitoring. **GFT next period:** AI-specific threat assessments (data poisoning, adversarial attacks), adversarial testing, automated drift alerts. **Now:** Yahoo retries, admin reload, stale-data fixes in README. |
| **Privacy and data governance** | Low *(Medium if hosted chat)* | Public market data; optional chat / logs / localStorage documented | `/privacy`; chat PII warning in RiskChatbot | Revise “no personal data” when chat enabled—OpenAI, server logs, disclaimer ack in localStorage. **Next:** [PRIVACY_DEPLOYMENT.md](./PRIVACY_DEPLOYMENT.md) per deployment; news date validation. |
| **Transparency** | High | XAI in development; backtesting in UI; methodology for asset managers | AM-facing badges, `/methodology`, backtests; DS use separate dashboards (not a second AV UI) | **Implemented:** methodology, model badges, backtest tables, `/api/meta`, data-as-of strip, demo LIME labeled. **Phase 1 workshop:** chat provenance guidelines, `inference_mode` in meta. **Next:** real LIME/SHAP; AM feedback. |
| **Diversity and fairness** | Low | FinBERT corpus; article counts and lookback in UI; S&P 100 scope stated | About scope; news count per ticker | **Implemented:** observation count in chart, lookback in news, diversity section in About. **Next:** sector coverage monitoring (offline). |
| **Societal and environmental well-being** | Medium | kgCO₂e train/retrain; energy per inference; retrain frequency | Methodology / README retrain policy | Track/publish carbon estimates when available. **Now:** incremental DeepVaR via `post_start.sh` documented in README. **Next:** CodeCarbon on train/incremental (not in current release). |
| **Accountability** | Low | Advisors/investors decide; AI is a tool; traceability | Legal pages; API provenance (`/api/meta`) | Maintain modularity, logging, EA board. **Implemented:** `prices_as_of`, `news_as_of`, `deepvar_as_of` in `/api/meta`. **Next:** git/build SHA in meta if needed; structured audit logs for institutional use. |

---

## GFT handoff (next period)

- Model drift monitoring and alerting
- Adversarial robustness testing (inputs, prompts, news text)
- Data-poisoning threat model and mitigations for news/price pipelines

---

## In-app evidence (May 2026 + workshop Phase 1)

- Legal routes and content under `src/content/legal/`
- `ComplianceStrip` + `DisclaimerAckModal` + `ModelBadge`
- `GET /api/meta` for data provenance timestamps and `inference_mode`
- Workshop docs: [WORKSHOP_ROADMAP.md](./WORKSHOP_ROADMAP.md), [WHY_NOT_NEUROMORPHIC_IN_PROD.md](./WHY_NOT_NEUROMORPHIC_IN_PROD.md)
