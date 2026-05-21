import type { LegalSection } from "@/components/layout/LegalLayout";
import { CONTACT_EMAIL } from "@/constants/legal";

export const termsIntro =
  "These Terms of Use govern your access to AlphaVision Insights. By using the application, you agree to these terms.";

export const termsSections: LegalSection[] = [
  {
    title: "Acceptance",
    paragraphs: [
      "If you do not agree to these Terms, do not use the application.",
      "We may update these Terms from time to time. Continued use after changes constitutes acceptance of the revised Terms.",
    ],
  },
  {
    title: "Permitted use",
    list: [
      "Personal, educational, and research use of the dashboard and API.",
      "Contributing to the open-source project under the repository license.",
      "Self-hosting the software in compliance with the MIT License and applicable law.",
    ],
  },
  {
    title: "Prohibited use",
    list: [
      "Presenting outputs as personalized investment advice to third parties without appropriate licenses.",
      "Relying solely on this tool for trading or portfolio decisions without independent verification.",
      "Attempting to disrupt, abuse, or reverse-engineer hosted services beyond what the open-source license allows.",
      "Scraping or redistributing third-party data in violation of Finnhub, Yahoo, or other provider terms.",
    ],
  },
  {
    title: "Open-source license",
    paragraphs: [
      "Application source code is licensed under the MIT License unless otherwise noted in the repository.",
      "Third-party libraries and models have their own licenses. See the Licenses page.",
    ],
  },
  {
    title: "Disclaimers",
    paragraphs: [
      "The Disclaimer and Methodology pages are incorporated by reference. All analytics are provided for information only, not as financial advice.",
    ],
  },
  {
    title: "Disclaimer of warranties",
    paragraphs: [
      "THE SOFTWARE AND CONTENT ARE PROVIDED \"AS IS\" AND \"AS AVAILABLE\" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.",
    ],
  },
  {
    title: "Limitation of liability",
    paragraphs: [
      "TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY ARISING FROM USE OF THE SOFTWARE.",
    ],
  },
  {
    title: "Contact",
    paragraphs: [`Questions about these Terms: ${CONTACT_EMAIL}`],
  },
];
