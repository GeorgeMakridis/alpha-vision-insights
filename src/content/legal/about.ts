import type { LegalSection } from "@/components/layout/LegalLayout";
import { GITHUB_REPO_URL } from "@/constants/legal";

export const aboutIntro =
  "AlphaVision Insights is an open-source risk analytics dashboard focused on S&P 100 constituents. It helps researchers and learners explore historical prices, news sentiment, and multiple Value-at-Risk methodologies in one place.";

export const aboutSections: LegalSection[] = [
  {
    title: "What we are",
    list: [
      "A community/educational tool for exploring risk metrics and news context.",
      "Built for asset managers — quantitative model development and deep technical validation use separate internal dashboards, not a second view inside this app.",
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
      "An unconditionally “trustworthy AI” system independent of context — see Disclaimer and Methodology (HLEG Trustworthy AI).",
    ],
  },
  {
    title: "Data control and Trustworthy AI",
    paragraphs: [
      "As tools are integrated for use beyond the project, we document what data is collected or shared, who operates the servers, and which third-party AI or cloud services are involved (/privacy).",
      "Trustworthiness is assessed for this dashboard’s context of use (research / education), including documented model properties and organisational human oversight — not as a blanket claim about every possible use.",
    ],
  },
  {
    title: "Scope",
    paragraphs: [
      "The dashboard covers S&P 100 tickers supported by the bundled data pipeline. Coverage depends on available price and news data.",
    ],
  },
  {
    title: "Diversity and coverage",
    paragraphs: [
      "The universe is large-cap U.S. equities (S&P 100). Results are not representative of all markets, regions, small caps, or asset classes.",
      "Sentiment and VaR metrics reflect only the public price and news data available to the pipeline—they may under-represent firms with sparse news coverage.",
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
