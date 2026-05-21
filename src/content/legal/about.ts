import type { LegalSection } from "@/components/layout/LegalLayout";
import { GITHUB_REPO_URL } from "@/constants/legal";

export const aboutIntro =
  "AlphaVision Insights is an open-source risk analytics dashboard focused on S&P 100 constituents. It helps researchers and learners explore historical prices, news sentiment, and multiple Value-at-Risk methodologies in one place.";

export const aboutSections: LegalSection[] = [
  {
    title: "What we are",
    list: [
      "A community/educational tool for exploring risk metrics and news context.",
      "Open-source software you can inspect, modify, and self-host.",
      "A research sandbox — not a commercial advisory service.",
    ],
  },
  {
    title: "What we are not",
    list: [
      "A regulated broker, investment adviser, or portfolio manager.",
      "A source of guaranteed or real-time trading signals.",
      "A substitute for professional due diligence or licensed advice.",
    ],
  },
  {
    title: "Scope",
    paragraphs: [
      "The dashboard covers S&P 100 tickers supported by the bundled data pipeline. Coverage depends on available price and news data.",
    ],
  },
  {
    title: "Open source",
    paragraphs: [
      GITHUB_REPO_URL !== "#"
        ? `Source code and contributions: ${GITHUB_REPO_URL}`
        : "Source code is published under the MIT License. Set VITE_GITHUB_REPO in your environment to link the repository from the footer.",
    ],
  },
];
