# Why neuromorphic AI is not in production finance today

Positioning document for **Cycle 1 Co-Creation Workshop** (Use Case 2) and **AlphaVision Insights**. This is project output for stakeholders—not investment advice or a vendor benchmark.

## Summary

Neuromorphic and spiking-neural-network (SNN) approaches show promise in research (energy efficiency, event-driven sensing, on-device inference). They are **not yet standard in regulated production finance** because of hardware maturity, skills gaps, validation evidence requirements, and integration cost—not because the ideas lack merit.

**AlphaVision today** uses established classical and deep-learning components on commodity infrastructure: statistical VaR, Monte Carlo simulation, DeepAR (Deep VaR), and FinBERT sentiment. Neuromorphic/BCPNN paths are tracked under **Use Case 2** as a **research pilot**, not as the current dashboard engine.

## Barriers (workshop-aligned)

### 1. Hardware and operational maturity

- Neuromorphic accelerators are not deployed like GPUs in most bank data centres.
- Toolchains, drivers, and MLOps patterns are less mature than CUDA/PyTorch ecosystems.
- Graceful degradation (e.g. DORA Article 25) requires a **proven classical fallback**—which AlphaVision already runs as the primary path.

### 2. Skills and maintainability

- Few teams combine **capital markets risk**, **regulatory reporting**, and **SNN/neuromorphic engineering**.
- Production finance favours auditable, well-understood models with long runbooks.

### 3. Regulatory and adoption evidence

Workshop participants prioritised **sandbox and stress-test evidence** over pure energy benchmarks. Banks typically need:

- Documented model risk management (validation, drift, independent review)
- Explainability suitable for auditors and asset managers
- Clear data lineage and third-party model review before adoption

AlphaVision addresses lineage incrementally via `/api/meta` and operator checklists; full regulatory packs are **Phase 2** program work (with GFT).

### 4. Integration cost

- Replacing Monte Carlo or parametric VaR with BCPNN distribution outputs (#5) is a **research integration**, not a configuration toggle.
- KYC (#3), AML/fraud (#4), and federated learning (#15) are **adjacent products**, not extensions of an S&P 100 market-data dashboard.

## What AlphaVision uses instead

| Capability | Current approach |
|------------|------------------|
| VaR (95% / 99%) | Parametric + Monte Carlo + DeepAR (ML estimate) |
| News sentiment | FinBERT (AI), with keyword fallback when unavailable |
| Risk chat | LLM grounded in dashboard RAG context |
| Explainability | Methodology page, model badges, demo word highlights (not production LIME) |
| Engine status | `inference_mode: classical` in `/api/meta` |

## When a neuromorphic pilot makes sense

A **Use Case 2 pilot** (separate from dashboard GA) may be justified when:

- Partner hardware/SDK and KTH/research collaboration (#8) are in place
- Benchmarks vs classical DL (#14, internal baselines) are defined
- Regulatory narrative (#12, #13) can cite sandbox results
- Hybrid fallback (#6) is demonstrated under failure scenarios

Until then, AlphaVision should **not** market neuromorphic outputs in the UI.

## Related documents

- [Workshop roadmap](./WORKSHOP_ROADMAP.md)
- [Competitive notes (TRIBE)](./COMPETITIVE_NOTES.md)
- [Ethical assessment](./ETHICAL_ASSESSMENT.md)
