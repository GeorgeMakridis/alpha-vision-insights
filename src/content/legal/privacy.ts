import type { LegalSection } from "@/components/layout/LegalLayout";
import { CONTACT_EMAIL } from "@/constants/legal";

export const privacyIntro =
  "This Privacy Policy describes how AlphaVision Insights may process information when you use the application. It is written for transparency in an open-source and demo-hosting context. It is not legal advice.";

export const privacySections: LegalSection[] = [
  {
    title: "Who we are (data controller)",
    paragraphs: [
      "AlphaVision Insights is an open-source research dashboard. If you self-host the software, you are the data controller for that deployment.",
      "For the public Extra Brain / UNP demo instance, privacy inquiries are handled via the contact below. The operator of the hosted instance is responsible for server-side processing on that deployment.",
      `Privacy contact: ${CONTACT_EMAIL}`,
    ],
  },
  {
    title: "Do not share private data",
    paragraphs: [
      "Do not enter personal data, passwords, account numbers, national IDs, customer lists, or other confidential information into the dashboard or the risk chatbot.",
      "The tool is for public market and portfolio risk exploration only. If you paste private data into chat, it may be sent to a third-party LLM provider.",
    ],
  },
  {
    title: "Information we may process",
    list: [
      "Technical logs (IP address, browser type, request timestamps) if you access a hosted instance — typically via the reverse proxy or hosting provider.",
      "Chat messages you submit to the risk assistant (when chat is enabled). These are sent to OpenAI for processing and are not stored long-term by the AlphaVision application itself.",
      "Local storage on your device (e.g., disclaimer acknowledgment flag).",
      "Optional privacy-friendly visitor analytics (Umami or Plausible) when enabled by the operator: page URL, referrer, and coarse device/browser metadata — not names, emails, or account data. Default deployments do not load analytics unless configured.",
      "No account registration is required for the default dashboard experience.",
    ],
  },
  {
    title: "Visitor analytics (optional)",
    paragraphs: [
      "If the operator enables analytics, this deployment may use Umami or Plausible (cookieless by default) to count page views and unique visitors for the research demo.",
      "No advertising profiles are built. Analytics can be disabled by omitting the VITE_ANALYTICS_* build variables.",
    ],
  },
  {
    title: "Risk chatbot and LLM provider",
    paragraphs: [
      "When chat is enabled, this deployment uses OpenAI’s Chat Completions API (api.openai.com) to generate replies. Prompts may include your message plus non-personal dashboard context (e.g. selected ticker, portfolio weights, data-as-of dates).",
      "AlphaVision does not persist chat transcripts in its database by default. OpenAI processes requests under its own terms and policies. Host or proxy access logs may still record that an API call occurred.",
      "Chat is optional: if OPENAI_API_KEY is not configured, the chatbot is unavailable.",
    ],
  },
  {
    title: "Third-party services",
    list: [
      "Finnhub — company news and market data (subject to Finnhub terms).",
      "Yahoo Finance (via yfinance) — historical prices when configured.",
      "Hugging Face — FinBERT model download for sentiment scoring.",
      "External XAI service (optional) — on-demand word-level explanations when XAI_API_URL is configured.",
      "OpenAI — risk chatbot responses when OPENAI_API_KEY is configured.",
      "Umami or Plausible (optional) — privacy-friendly visitor counts when analytics env vars are set at frontend build time.",
    ],
  },
  {
    title: "Purpose and legal basis",
    paragraphs: [
      "We process data to operate the dashboard, refresh market datasets, compute risk metrics, and (if enabled) respond to chat queries.",
      "Where GDPR applies, processing is typically based on legitimate interests (operating a research demo) and, for optional chat, your decision to use that feature. Do not submit personal data via chat.",
    ],
  },
  {
    title: "Retention",
    paragraphs: [
      "Server and reverse-proxy logs may be retained for a limited period for security and debugging (operator-defined).",
      "Chat content is not intended to be stored long-term by the AlphaVision application; check your deployment and OpenAI’s retention settings if you operate an instance.",
      "Market data files on disk are retained according to your update schedule.",
    ],
  },
  {
    title: "Your rights",
    paragraphs: [
      "Depending on your jurisdiction, you may have rights to access, correct, delete, or restrict processing of personal data. Contact the privacy address below for the demo instance, or the operator of any other instance you use.",
    ],
  },
  {
    title: "Security",
    paragraphs: [
      "We use reasonable measures appropriate for a research tool (e.g. TLS on public demos), but no system is completely secure.",
      "Do not submit sensitive personal or financial account information anywhere in the product.",
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
