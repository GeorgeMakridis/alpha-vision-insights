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
    ],
  },
  {
    id: "chat",
    title: "Risk chatbot (AI assistant)",
    paragraphs: [
      "Optional feature using an OpenAI-compatible API. Context includes selected ticker, portfolio weights, and data dates from the backend.",
      "Responses are generative and educational only — not personalized investment advice.",
    ],
  },
  {
    id: "lime",
    title: "LIME explanations (AI)",
    paragraphs: [
      "Optional word-level highlights for news sentiment via LIME. Explanations are approximate and for exploration only.",
    ],
  },
  {
    id: "limitations",
    title: "Known limitations",
    list: [
      "Past performance and backtests do not predict future results.",
      "Corporate actions, delistings, and symbol changes may cause gaps.",
      "BLNN VaR may show as zero if not connected to an external service.",
      "First load may serve cached metrics until background refresh completes.",
    ],
  },
];
