import { Link } from "react-router-dom";
import {
  FOOTER_LEGAL_LINKS,
  GITHUB_REPO_URL,
  PRODUCT_NAME,
  TAGLINE,
} from "@/constants/legal";

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-800 py-6 mt-8">
      <div className="container max-w-7xl mx-auto px-4 space-y-4">
        <p className="text-sm text-slate-400">{TAGLINE}</p>
        <nav
          className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500"
          aria-label="Legal and information"
        >
          {FOOTER_LEGAL_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              to={href}
              className="hover:text-dashboard-accent transition-colors"
            >
              {label}
            </Link>
          ))}
          {GITHUB_REPO_URL !== "#" && (
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-dashboard-accent transition-colors"
            >
              GitHub
            </a>
          )}
        </nav>
        <p className="text-xs text-slate-600">
          {PRODUCT_NAME} · Data may be delayed · Model outputs are estimates only
        </p>
      </div>
    </footer>
  );
}
