import { useEffect } from "react";

type AnalyticsProvider = "umami" | "plausible" | "";

/** Extra Brain / UNP demo — Umami Cloud (overridable via VITE_ANALYTICS_* at build time). */
const DEFAULT_PROVIDER: AnalyticsProvider = "umami";
const DEFAULT_SCRIPT_URL = "https://cloud.umami.is/script.js";
const DEFAULT_WEBSITE_ID = "f6455d9b-acb4-40d7-9aa4-b880867e7ed8";

/**
 * Privacy-friendly visitor analytics (Umami by default for the public demo).
 * Override or disable with VITE_ANALYTICS_* at Docker/frontend build time
 * (set VITE_ANALYTICS_PROVIDER= to disable).
 */
export default function VisitorAnalytics() {
  useEffect(() => {
    const rawProvider = (
      import.meta.env.VITE_ANALYTICS_PROVIDER ?? DEFAULT_PROVIDER
    )
      .toString()
      .trim()
      .toLowerCase() as AnalyticsProvider | "off" | "false" | "0";

    if (
      !rawProvider ||
      rawProvider === "off" ||
      rawProvider === "false" ||
      rawProvider === "0"
    ) {
      return;
    }

    const provider = rawProvider as AnalyticsProvider;
    const scriptUrl = (
      import.meta.env.VITE_ANALYTICS_SCRIPT_URL || DEFAULT_SCRIPT_URL
    ).trim();
    const websiteId = (
      import.meta.env.VITE_ANALYTICS_WEBSITE_ID || DEFAULT_WEBSITE_ID
    ).trim();
    const domain = (import.meta.env.VITE_ANALYTICS_DOMAIN || "").trim();

    if (!scriptUrl) {
      return;
    }

    if (provider === "umami" && !websiteId) {
      return;
    }
    if (provider === "plausible" && !domain) {
      return;
    }

    const existing = document.querySelector(
      `script[data-alphavision-analytics="${provider}"]`,
    );
    if (existing) {
      return;
    }

    const script = document.createElement("script");
    script.defer = true;
    script.src = scriptUrl;
    script.dataset.alphavisionAnalytics = provider;

    if (provider === "umami") {
      script.dataset.websiteId = websiteId;
    } else if (provider === "plausible") {
      script.dataset.domain = domain;
    } else {
      return;
    }

    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return null;
}
