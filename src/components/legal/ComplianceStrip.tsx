import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { GLOBAL_DISCLAIMER_ONE_LINER } from "@/constants/legal";

export default function ComplianceStrip() {
  return (
    <div
      className="border-b border-amber-900/40 bg-amber-950/20"
      role="note"
      aria-label="Regulatory disclaimer"
    >
      <div className="container max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-center gap-2 text-xs text-amber-200/90">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden />
        <span>{GLOBAL_DISCLAIMER_ONE_LINER}</span>
        <span className="text-slate-500">·</span>
        <Link
          to="/disclaimer"
          className="underline underline-offset-2 hover:text-amber-100"
        >
          Read disclaimer
        </Link>
      </div>
    </div>
  );
}
