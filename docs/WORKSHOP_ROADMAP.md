# Workshop roadmap — Cycle 1 (27 Mar 2026)

Co-creation workshop: **Use Case 2 — Shaping the Future of Cognitive Financial Services with Neuromorphic Intelligence** (GFT Italia HQ, Milan, hybrid).

This document maps convergent workshop feedback to **AlphaVision Insights** (open-source S&P 100 risk dashboard for **asset managers**). It is an engineering/planning artifact—not a commitment to implement every item in this repository.

**Product boundary:** AlphaVision is **asset-manager facing only**. Data scientists and model researchers use **separate internal dashboards**; a split AM/DS product UI (**workshop #7**) is **not planned** for this app.

Related: [Ethical assessment](./ETHICAL_ASSESSMENT.md) · [Privacy deployment](./PRIVACY_DEPLOYMENT.md) · [Why not neuromorphic in production](./WHY_NOT_NEUROMORPHIC_IN_PROD.md)

**Deferred to GFT (next period):** model drift monitoring; adversarial robustness testing; data-poisoning assessment.

---

## Master table (15 workshop items)

| # | Workshop item | Needed for AlphaVision? | Already covered? | Phase | Notes |
|---|---------------|-------------------------|------------------|-------|-------|
| 1 | Scenario simulation (what-if reallocations, bull/bear/stress) | **Yes** | Partial: portfolio weights + VaR charts; no preset scenarios | **Phase 2** | AM explicit ask |
| 2 | Portfolio recommendations from customer risk profile (chat) | **Yes, guarded** | Partial: educational chat + portfolio context | **Phase 2** | Legal review before “recommendations” |
| 3 | KYC integration | **No** | None | **Separate product** | Neuromorphic onboarding = Use Case 2 pilot |
| 4 | Anomaly / fraud / AML (BCPNN) | **No** (this dashboard) | None | **Separate use-case** | Parallel mini-app |
| 5 | Confidence-distribution VaR (BCPNN) | **No** until BCPNN exists | Parametric, Monte Carlo, Deep VaR today | **Research** | Pawel/Giorgio thread |
| 6 | Hybrid architecture + DORA fallback visibility | **Partial** | Badges, methodology, `/api/meta`; classical only | **Phase 1** | `inference_mode` in meta + UI line |
| 7 | Split dashboard: AM vs data scientist views | **No** | AM: badges, methodology, strip; DS tools elsewhere | **N/A** | **Invalid for AV** |
| 8 | BCPNN-native explainability | **No** (current stack) | Demo LIME only | **Research** | Orfeas + KTH |
| 9 | Chatbot answer-level “why” (traceable outputs) | **Yes** | Partial: RAG context; weak citation discipline | **Phase 1** | Provenance prepend + prompt guidelines |
| 10 | Regulator audit trail / DORA–AI Act export | **Partial** | Meta, legal pages, privacy checklist | **Phase 2** | Export bundle + audit page |
| 11 | Why neuromorphic isn’t in production finance | **Yes** (positioning) | Partial: README, EA doc | **Phase 1** | [WHY_NOT_NEUROMORPHIC_IN_PROD.md](./WHY_NOT_NEUROMORPHIC_IN_PROD.md) |
| 12 | Stress-test / sandbox-pilot evidence | **Yes** | Kupiec/backtest UI; no formal pack | **Phase 2** | GFT + scenarios from #1 |
| 13 | Independent third-party model review | **Yes** (program) | None in code | **Process** | Milestone, not a dev ticket |
| 14 | Position vs Meta TRIBE v2 | **Yes** (short) | None | **Phase 1** | [COMPETITIVE_NOTES.md](./COMPETITIVE_NOTES.md) |
| 15 | Federated learning first-class | **No** (AV v1) | Privacy doc acknowledges limits | **R&D** | Consortium-scale |

---

## Phase summary

### Phase 1 (current) — docs + minimal additive code

- Workshop docs (this file, neuromorphic positioning, TRIBE note)
- `/api/meta`: `inference_mode`, `engines`, `neuromorphic_active`, optional `build_sha`
- Compliance strip: classical engine line
- Chat: provenance block + citation guidelines (append-only)
- About: AM-only product boundary (copy)

**Does not change:** VaR math, charts, portfolio APIs, data pipelines, news filters, dual-dashboard routes.

### Phase 2 (2–3 months)

- #1 scenario simulation (preset stresses + what-if weights)
- #9 full explain-this-metric tooling
- #2 risk-profile dialogue (with legal sign-off)
- #10 audit export v1
- #12 sandbox evidence pack (with GFT)
- GFT: drift, adversarial, data-poisoning

### Phase 3 / research

- #4, #5, #8 BCPNN / neuromorphic pilot
- #3 KYC, #15 federated learning
- #13 third-party review execution

---

## Workshop themes → AlphaVision

| Theme | Phase 1 | Later |
|-------|---------|-------|
| Explainability (why) | Chat provenance, demo LIME labeled, methodology | Real LIME/SHAP; AM summaries |
| Trust / regulation | Docs, meta, legal UX | Audit export, gap analysis, GFT security |
| Neuromorphic value | Positioning white paper | Pilot + benchmarks |
| Energy | README retrain policy | CodeCarbon |

---

## In-app evidence (Phase 1)

- `GET /api/meta` — dates + `inference_mode`
- `ComplianceStrip` — disclaimer, data-as-of, engine line
- Chat — provenance in RAG context
- Legal routes — `/about`, `/methodology`, `/disclaimer`
