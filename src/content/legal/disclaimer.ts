import type { LegalSection } from "@/components/layout/LegalLayout";

export const disclaimerIntro =
  "Please read this disclaimer carefully before using AlphaVision Insights. By using this application, you acknowledge the limitations below.";

export const disclaimerSections: LegalSection[] = [
  {
    id: "no-advice",
    title: "No financial, legal, or tax advice",
    paragraphs: [
      "AlphaVision Insights provides risk analytics, charts, and educational content for informational and research purposes only.",
      "Nothing on this site constitutes a recommendation, solicitation, or offer to buy or sell any security or financial instrument, or to adopt any investment strategy.",
      "You should consult a licensed financial adviser, accountant, or attorney before making investment or legal decisions.",
    ],
  },
  {
    id: "not-regulated",
    title: "Not a regulated entity",
    paragraphs: [
      "The operators of this open-source project are not registered or licensed as investment advisers, broker-dealers, banks, or other regulated financial services providers in any jurisdiction, unless expressly stated otherwise in writing.",
      "Use of this tool does not create a client, fiduciary, or advisory relationship between you and the project contributors or hosts.",
    ],
  },
  {
    id: "ai-models",
    title: "AI and model-generated outputs",
    list: [
      "Deep VaR uses a machine-learning model (DeepAR). Outputs are estimates, not forecasts guaranteed to be accurate.",
      "News sentiment uses FinBERT (AI). Scores may be wrong, biased, or misaligned with human judgment.",
      "The risk chatbot uses a large language model (LLM). It may hallucinate facts and must not be treated as advice.",
      "LIME explanations are post-hoc approximations and may not fully represent model behavior.",
      "Parametric and Monte Carlo VaR rely on historical return assumptions that may not hold in the future.",
    ],
  },
  {
    id: "data",
    title: "Data limitations",
    paragraphs: [
      "Market prices and news are sourced from third parties (e.g., Yahoo Finance, Finnhub). Data may be delayed, revised, incomplete, or contain errors.",
      "S&P 100 coverage may not include all index constituents at all times. Corporate actions and ticker changes may not be fully reflected.",
    ],
  },
  {
    id: "var",
    title: "Risk metrics limitations",
    paragraphs: [
      "Value-at-Risk (VaR) and related statistics describe past model behavior under stated assumptions. They do not predict future losses.",
      "Backtesting breach counts are illustrative; good historical fit does not imply future performance.",
    ],
  },
  {
    id: "liability",
    title: "Limitation of liability",
    paragraphs: [
      "To the fullest extent permitted by applicable law, the project contributors and distributors disclaim all liability for any loss or damage arising from use of or reliance on this software or its outputs, whether direct, indirect, incidental, or consequential.",
      "The software is provided on an \"AS IS\" basis without warranties of any kind. See the MIT License and Terms of Use.",
    ],
  },
  {
    id: "responsibility",
    title: "Your responsibility",
    paragraphs: [
      "You are solely responsible for how you use this tool and for verifying any information before acting on it.",
      "Do not enter passwords, account numbers, or other sensitive personal data into the chatbot or other features.",
    ],
  },
];
