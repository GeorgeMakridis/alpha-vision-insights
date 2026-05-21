export const PRODUCT_NAME = "AlphaVision Insights";

export const TAGLINE =
  "Open-source S&P 100 risk analytics for research and education — not financial advice.";

export const GLOBAL_DISCLAIMER_ONE_LINER =
  "Not regulated · Not financial advice · For information and research only";

export const ACK_STORAGE_KEY = "disclaimer_ack_v1";

export const LEGAL_LAST_UPDATED = "2026-05-21";

export const CONTACT_EMAIL =
  import.meta.env.VITE_CONTACT_EMAIL ?? "legal@example.com";

export const GITHUB_REPO_URL =
  import.meta.env.VITE_GITHUB_REPO ?? "#";

export const FOOTER_LEGAL_LINKS = [
  { label: "About", href: "/about" },
  { label: "Methodology", href: "/methodology" },
  { label: "Disclaimer", href: "/disclaimer" },
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Licenses", href: "/licenses" },
] as const;
