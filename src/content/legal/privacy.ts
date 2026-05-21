import type { LegalSection } from "@/components/layout/LegalLayout";
import { CONTACT_EMAIL } from "@/constants/legal";

export const privacyIntro =
  "This Privacy Policy describes how AlphaVision Insights may process information when you use the application. It is written for transparency in an open-source, self-hosted context.";

export const privacySections: LegalSection[] = [
  {
    title: "Who we are",
    paragraphs: [
      "AlphaVision Insights is an open-source project. If you self-host, you are the data controller for your deployment. If you use a public demo instance, the operator of that instance is the controller for server-side processing.",
    ],
  },
  {
    title: "Information we may process",
    list: [
      "Technical logs (IP address, browser type, request timestamps) if you access a hosted instance.",
      "Chat messages you submit to the risk assistant, which may be sent to a third-party LLM API (e.g., OpenAI) for processing.",
      "Local storage on your device (e.g., disclaimer acknowledgment flag).",
      "No account registration is required for the default dashboard experience.",
    ],
  },
  {
    title: "Third-party services",
    list: [
      "Finnhub — company news and market data (subject to Finnhub terms).",
      "Yahoo Finance (via yfinance) — historical prices when configured.",
      "Hugging Face — FinBERT model download for sentiment scoring.",
      "OpenAI (optional) — risk chatbot responses when OPENAI_API_KEY is configured.",
    ],
  },
  {
    title: "Purpose and legal basis",
    paragraphs: [
      "We process data to operate the dashboard, refresh market datasets, compute risk metrics, and respond to chat queries.",
      "Where GDPR applies, processing is typically based on legitimate interests (operating the service) and your consent where required (e.g., optional chat).",
    ],
  },
  {
    title: "Retention",
    paragraphs: [
      "Server logs may be retained for a limited period for security and debugging.",
      "Chat content is not intended to be stored long-term by default; check your deployment configuration.",
      "Market data files on disk are retained according to your update schedule.",
    ],
  },
  {
    title: "Your rights",
    paragraphs: [
      "Depending on your jurisdiction, you may have rights to access, correct, delete, or restrict processing of personal data. Contact the operator of the instance you use.",
    ],
  },
  {
    title: "Security",
    paragraphs: [
      "We use reasonable measures appropriate for a research tool, but no system is completely secure. Do not submit sensitive personal or financial account information.",
    ],
  },
  {
    title: "Children",
    paragraphs: ["The service is not directed at children under 16."],
  },
  {
    title: "Contact",
    paragraphs: [`Privacy inquiries: ${CONTACT_EMAIL}`],
  },
];
