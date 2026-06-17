import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { GLOBAL_DISCLAIMER_ONE_LINER } from "@/constants/legal";
import { apiService } from "@/services/api";

function formatAsOf(value: string | null | undefined): string {
  return value ?? "—";
}

export default function ComplianceStrip() {
  const { data: meta } = useQuery({
    queryKey: ["data-meta"],
    queryFn: () => apiService.getMeta(),
    staleTime: 60_000,
    retry: 1,
  });

  return (
    <div
      className="border-b border-amber-900/40 bg-amber-950/20"
      role="note"
      aria-label="Regulatory disclaimer"
    >
      <div className="container max-w-7xl mx-auto px-4 py-2 flex flex-col items-center gap-1.5">
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-amber-200/90">
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
        {meta && (
          <div className="text-center space-y-0.5" aria-live="polite">
            <p className="text-[11px] text-slate-500">
              Data as of — prices: {formatAsOf(meta.prices_as_of)} · news:{" "}
              {formatAsOf(meta.news_as_of)} · Deep VaR:{" "}
              {meta.deepvar_available
                ? formatAsOf(meta.deepvar_as_of)
                : "not available"}
            </p>
            <p className="text-[11px] text-slate-500">
              Engine: Classical (statistical VaR + DeepAR)
              {meta.neuromorphic_active
                ? " — neuromorphic line active"
                : " — neuromorphic not active"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
