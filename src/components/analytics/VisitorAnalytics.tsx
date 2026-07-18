import { useEffect } from "react";

type AnalyticsProvider = "umami" | "plausible" | "";

/**
 * Optional privacy-friendly visitor analytics (Umami or Plausible).
 * Loads only when VITE_ANALYTICS_* is set at build time — no cookies for Umami/Plausible defaults.
 * Leave unset for local/dev (zero Miguel infra if using Umami Cloud / Plausible Cloud).
 */
export default function VisitorAnalytics() {
  useEffect(() => {
    const provider = (
      import.meta.env.VITE_ANALYTICS_PROVIDER || ""
    ).toLowerCase() as AnalyticsProvider;
    const scriptUrl = (import.meta.env.VITE_ANALYTICS_SCRIPT_URL || "").trim();
    const websiteId = (import.meta.env.VITE_ANALYTICS_WEBSITE_ID || "").trim();
    const domain = (import.meta.env.VITE_ANALYTICS_DOMAIN || "").trim();

    if (!provider || !scriptUrl) {
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
