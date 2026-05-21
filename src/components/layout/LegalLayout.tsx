import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { LEGAL_LAST_UPDATED, PRODUCT_NAME } from "@/constants/legal";
import SiteFooter from "./SiteFooter";

export interface LegalSection {
  id?: string;
  title: string;
  paragraphs?: string[];
  list?: string[];
}

interface LegalLayoutProps {
  title: string;
  intro?: string;
  sections: LegalSection[];
}

export default function LegalLayout({ title, intro, sections }: LegalLayoutProps) {
  return (
    <div
      className="min-h-screen text-slate-100 flex flex-col"
      style={{ backgroundColor: "#0a0e1a" }}
    >
      <header className="border-b border-slate-800 py-4">
        <div className="container max-w-3xl mx-auto px-4 flex items-center justify-between">
          <Link
            to="/"
            className="text-sm text-slate-400 hover:text-dashboard-accent flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <span className="text-sm text-slate-500">{PRODUCT_NAME}</span>
        </div>
      </header>

      <main className="flex-1 container max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-2">{title}</h1>
        <p className="text-sm text-slate-500 mb-8">
          Last updated: {LEGAL_LAST_UPDATED}
        </p>
        {intro && (
          <p className="text-slate-300 mb-8 leading-relaxed">{intro}</p>
        )}
        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.id ?? section.title} id={section.id}>
              <h2 className="text-xl font-semibold text-slate-100 mb-3">
                {section.title}
              </h2>
              {section.paragraphs?.map((p, i) => (
                <p key={i} className="text-slate-300 leading-relaxed mb-3">
                  {p}
                </p>
              ))}
              {section.list && (
                <ul className="list-disc pl-6 space-y-2 text-slate-300">
                  {section.list.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
        <p className="mt-12 text-xs text-slate-500 italic">
          This document is provided for informational purposes and does not
          constitute legal advice. Consult qualified counsel before relying on it
          for compliance decisions.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
