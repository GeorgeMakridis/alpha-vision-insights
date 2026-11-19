import type { LegalSection } from "@/components/layout/LegalLayout";

export const methodologyIntro =
  "This page explains how dashboard metrics are produced. Labels in the UI (e.g., \"ML estimate\", \"AI sentiment\") match the descriptions below.";

export const methodologySections: LegalSection[] = [
  {
    id: "data",
    title: "Market data",
    paragraphs: [
      "Daily prices are loaded from sp100_daily_prices.csv, updated via Yahoo Finance (yfinance) in the data updater.",
      "News headlines are stored in news_sentiment_updated.json, primarily from Finnhub company-news with optional Yahoo fallback.",
      "Data may be delayed or revised by providers. The API serves in-memory snapshots refreshed after background updates.",
    ],
  },
  {
    id: "parametric",
    title: "Parametric VaR (statistical model)",
    paragraphs: [
      "Uses a rolling window of historical returns (default 252 trading days) and assumes a parametric distribution to estimate VaR at 95% and 99% confidence.",
      "Displayed as negative return percentages and implied price levels for charting.",
    ],
  },
  {
    id: "montecarlo",
    title: "Monte Carlo VaR (statistical model)",
    paragraphs: [
      "Simulates return scenarios from historical data over the same rolling window to estimate tail risk.",
      "Independent of Deep VaR; useful for comparison, not a ground truth.",
    ],
  },
  {
    id: "deepvar",
    title: "Deep VaR (ML estimate)",
    paragraphs: [
      "Computed with a DeepAR model (GluonTS) trained on historical return series. Results are stored in deepvar_dashboard.csv.",
      "Incremental updates extend forecasts when new price dates arrive. Values are model estimates — they can be flat or wrong during regime changes.",
      "Labeled \"ML estimate\" in charts and tables.",
    ],
  },
  {
    id: "sentiment",
    title: "News sentiment (AI)",
    paragraphs: [
      "New articles are scored with FinBERT (ProsusAI/finbert) when available; otherwise a keyword fallback may apply.",
      "Scores range roughly from -1 (negative) to +1 (positive). AI may misclassify headlines.",
      "Optional second series on the price chart: UC2 federated BCPNN sentiment (Extra Brain FL platform), served by the uc2-sentiment Docker service when UC2_SENTIMENT_URL is set and a downloaded model is available. FinBERT remains the primary ingest score and is never replaced.",
    ],
  },
  {
    id: "chat",
    title: "Risk chatbot (AI assistant)",
    paragraphs: [
      "Optional feature using OpenAI’s Chat Completions API when OPENAI_API_KEY is set. Context includes selected ticker, portfolio weights, and data dates from the backend — not private personal data.",
      "Do not paste passwords, account numbers, or other private information into chat. Responses are generative and educational only — not personalized investment advice.",
    ],
  },
  {
    id: "lime",
    title: "XAI explanations (external service)",
    paragraphs: [
      "Sentiment scores on headlines come from FinBERT at ingest time.",
      "The XAI control fetches word-level highlights and narrative insights on demand from an external HTTP service when XAI_API_URL is configured on the backend.",
      "If the service is unavailable, the UI shows an error rather than illustrative mock data (unless XAI_USE_MOCK=true for local development).",
    ],
  },
  {
    id: "bcpnn",
    title: "BCPNN / partner VaR (optional external service)",
    paragraphs: [
      "When integrated, AlphaVision may call a partner VaR endpoint (POST with daily returns, API key authentication). Forecasts typically use a fixed lookback (e.g. 252 trading days).",
      "Partner OOS evaluation has shown reasonable pooled coverage with documented limitations: weaker per-ticker calibration, incomplete volatility scaling across calm vs volatile names, and a finite return-grid edge (warnings field).",
      "Deep VaR in this dashboard is motivated in part by improving adaptation to each name’s volatility regime relative to models that under-cover more volatile tickers.",
    ],
  },
  {
    id: "trustworthy-ai",
    title: "Trustworthy AI assessment (HLEG)",
    paragraphs: [
      "Assessment is tailored to this research / educational use case. Model-level evidence (backtests, Kupiec tables, methodology, known failure modes) supports trustworthiness claims but does not make the system unconditionally trustworthy in every deployment context.",
      "Human agency, accountability, and organisational arrangements remain outside the model weights: users must not treat outputs as automated investment decisions.",
      "Privacy and data governance for integrated third parties (OpenAI, XAI, partner VaR hosts) are described under /privacy and the operator deployment checklist.",
    ],
  },
  {
    id: "limitations",
    title: "Known limitations",
    list: [
      "Past performance and backtests do not predict future results.",
      "Corporate actions, delistings, and symbol changes may cause gaps.",
      "BLNN / BCPNN VaR may be unavailable if the external service is not connected.",
      "First load may serve cached metrics until background refresh completes.",
      "XAI explanations depend on the external provider; they are not FinBERT attributions.",
      "Volatility scaling and per-ticker coverage can be weaker than pooled metrics suggest — see partner OOS notes and Deep VaR motivation.",
    ],
  },
];
