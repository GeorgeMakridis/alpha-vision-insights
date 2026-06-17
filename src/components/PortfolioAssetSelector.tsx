
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/services/api";
import PortfolioAllocationSummary from "@/components/portfolio/PortfolioAllocationSummary";
import PortfolioHoldingsTable from "@/components/portfolio/PortfolioHoldingsTable";
import PortfolioAddAssetCombobox from "@/components/portfolio/PortfolioAddAssetCombobox";

interface PortfolioAssetSelectorProps {
  selectedAssets: string[];
  weights: Record<string, number>;
  tempWeights: Record<string, number>;
  includeCash: boolean;
  hasPendingChanges?: boolean;
  onSelectAsset: (ticker: string, selected: boolean) => void;
  onWeightChange: (ticker: string, weight: number) => void;
  onIncludeCashChange: (include: boolean) => void;
  onApplyWeights: () => void;
  onResetWeights: () => void;
}

export default function PortfolioAssetSelector({
  selectedAssets,
  weights,
  tempWeights,
  includeCash,
  hasPendingChanges = false,
  onSelectAsset,
  onWeightChange,
  onIncludeCashChange,
  onApplyWeights,
  onResetWeights,
}: PortfolioAssetSelectorProps) {
  const { data: stocksData, isLoading, error } = useQuery({
    queryKey: ["stocks"],
    queryFn: () => apiService.getStocks(),
  });

  const stocks = stocksData?.stocks ?? [];
  const tempTotal = Object.values(tempWeights).reduce((sum, w) => sum + w, 0) * 100;
  const cashPercent = includeCash ? Math.max(0, 100 - tempTotal) : 0;

  if (isLoading) {
    return (
      <div className="bg-slate-800/30 border border-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-medium mb-4">Portfolio builder</h3>
        <p className="text-muted-foreground">Loading stocks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800/30 border border-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-medium mb-4">Portfolio builder</h3>
        <p className="text-dashboard-negative">
          Error loading stocks: {error.message || "Unknown error"}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/30 border border-slate-800 rounded-lg p-4 flex flex-col max-h-[calc(100vh-12rem)]">
      <h3 className="text-lg font-medium mb-3 shrink-0">Portfolio builder</h3>

      <PortfolioAllocationSummary
        includeCash={includeCash}
        tempTotal={tempTotal}
        cashPercent={cashPercent}
        hasPendingChanges={hasPendingChanges}
        hasAppliedWeights={Object.keys(weights).length > 0}
        onIncludeCashChange={onIncludeCashChange}
        onApplyWeights={onApplyWeights}
        onResetWeights={onResetWeights}
      />

      <div className="flex-1 min-h-0 overflow-y-auto pr-1 mb-3">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Holdings ({selectedAssets.length})
        </h4>
        <PortfolioHoldingsTable
          selectedAssets={selectedAssets}
          tempWeights={tempWeights}
          stocks={stocks}
          onWeightChange={onWeightChange}
          onRemoveAsset={(ticker) => onSelectAsset(ticker, false)}
        />
      </div>

      <div className="shrink-0 pt-2 border-t border-slate-800">
        <PortfolioAddAssetCombobox
          stocks={stocks}
          selectedAssets={selectedAssets}
          onSelectAsset={onSelectAsset}
        />
      </div>
    </div>
  );
}
