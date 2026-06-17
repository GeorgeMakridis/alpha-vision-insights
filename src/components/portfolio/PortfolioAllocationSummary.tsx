
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PortfolioAllocationSummaryProps {
  includeCash: boolean;
  tempTotal: number;
  cashPercent: number;
  hasPendingChanges: boolean;
  hasAppliedWeights: boolean;
  onIncludeCashChange: (include: boolean) => void;
  onApplyWeights: () => void;
  onResetWeights: () => void;
}

export default function PortfolioAllocationSummary({
  includeCash,
  tempTotal,
  cashPercent,
  hasPendingChanges,
  hasAppliedWeights,
  onIncludeCashChange,
  onApplyWeights,
  onResetWeights,
}: PortfolioAllocationSummaryProps) {
  const isOverAllocated = tempTotal > 100;
  const equityWidth = isOverAllocated ? 100 : Math.max(0, tempTotal);
  const cashWidth = includeCash && !isOverAllocated ? cashPercent : 0;
  const unallocatedWidth =
    !includeCash && !isOverAllocated ? Math.max(0, 100 - tempTotal) : 0;

  return (
    <div className="sticky top-0 z-10 bg-slate-800/95 backdrop-blur-sm pb-3 mb-2 border-b border-slate-700/80 shrink-0 space-y-2.5">
      {hasPendingChanges && (
        <p className="text-xs text-yellow-500/90 bg-yellow-500/10 border border-yellow-500/20 rounded px-2 py-1">
          Unapplied changes — risk charts use last applied weights until Apply.
        </p>
      )}

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Allocation (draft)</span>
          <span
            className={cn(
              "font-medium tabular-nums",
              isOverAllocated
                ? "text-dashboard-negative"
                : tempTotal < 100 && !includeCash
                  ? "text-yellow-500"
                  : "text-dashboard-positive"
            )}
          >
            {isOverAllocated ? `${tempTotal.toFixed(0)}% (over)` : `${tempTotal.toFixed(0)}% equity`}
            {includeCash && !isOverAllocated && ` · ${cashPercent.toFixed(0)}% cash`}
          </span>
        </div>

        <div
          className="h-2 flex w-full rounded-full overflow-hidden bg-slate-700/80"
          role="progressbar"
          aria-valuenow={Math.min(tempTotal, 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Portfolio allocation"
        >
          <div
            className={cn(
              "h-full transition-all",
              isOverAllocated ? "bg-dashboard-negative" : "bg-dashboard-positive"
            )}
            style={{ width: `${equityWidth}%` }}
          />
          {cashWidth > 0 && (
            <div
              className="h-full bg-slate-500 transition-all"
              style={{ width: `${cashWidth}%` }}
            />
          )}
          {unallocatedWidth > 0 && (
            <div
              className="h-full bg-slate-600/50 transition-all"
              style={{ width: `${unallocatedWidth}%` }}
            />
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="cash-option"
          checked={includeCash}
          onCheckedChange={(checked) => onIncludeCashChange(checked === true)}
        />
        <label htmlFor="cash-option" className="text-xs font-medium cursor-pointer leading-tight">
          Include cash (remainder, zero risk)
        </label>
      </div>

      {!hasPendingChanges && hasAppliedWeights && (
        <p className="text-xs text-dashboard-positive/80">Applied to risk charts</p>
      )}

      <div className="flex gap-2">
        <Button
          onClick={onApplyWeights}
          size="sm"
          className="flex-1 bg-dashboard-accent hover:bg-dashboard-accent/80 text-white h-8 text-xs"
        >
          Apply weights
        </Button>
        <Button
          onClick={onResetWeights}
          size="sm"
          variant="outline"
          className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800 h-8 text-xs"
          title="Equal draft weight per holding; click Apply to update charts"
        >
          Reset draft
        </Button>
      </div>
    </div>
  );
}
