
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/services/api";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

interface PortfolioAssetSelectorProps {
  selectedAssets: string[];
  weights: Record<string, number>;
  tempWeights: Record<string, number>;
  includeCash: boolean;
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
  onSelectAsset,
  onWeightChange,
  onIncludeCashChange,
  onApplyWeights,
  onResetWeights,
}: PortfolioAssetSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch stocks data from API
  const { data: stocksData, isLoading, error } = useQuery({
    queryKey: ['stocks'],
    queryFn: () => apiService.getStocks(),
  });

  // Filter stocks based on search query
  const filteredStocks = stocksData?.stocks?.filter(
    (stock) =>
      stock.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="bg-slate-800/30 border border-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-medium mb-4">Portfolio Assets</h3>
        <p className="text-muted-foreground">Loading stocks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800/30 border border-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-medium mb-4">Portfolio Assets</h3>
        <p className="text-dashboard-negative">
          Error loading stocks: {error.message || 'Unknown error'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/30 border border-slate-800 rounded-lg p-4">
      <h3 className="text-lg font-medium mb-4">Portfolio Assets</h3>
      
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search stocks..."
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      {/* Cash Option */}
      <div className="mb-4 p-3 bg-slate-900/50 rounded-md border border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="cash-option"
              checked={includeCash}
              onCheckedChange={(checked) => onIncludeCashChange(checked === true)}
            />
            <label htmlFor="cash-option" className="text-sm font-medium cursor-pointer">
              Include Cash (remaining allocation)
            </label>
          </div>
          {includeCash && (
            <div className="text-sm text-dashboard-accent font-medium">
              {(() => {
                const totalAllocated = Object.values(tempWeights).reduce((sum, w) => sum + w, 0);
                const cashPercent = Math.max(0, 100 - totalAllocated * 100);
                return `${cashPercent.toFixed(1)}%`;
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Total Allocation Display */}
      <div className="mb-4 p-2 bg-slate-900/50 rounded-md">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total Allocation:</span>
          <span className={`font-medium ${
            (() => {
              const total = Object.values(tempWeights).reduce((sum, w) => sum + w, 0) * 100;
              if (total > 100) return 'text-dashboard-negative';
              if (total < 100 && !includeCash) return 'text-yellow-500';
              return 'text-dashboard-positive';
            })()
          }`}>
            {(() => {
              const total = Object.values(tempWeights).reduce((sum, w) => sum + w, 0) * 100;
              return `${total.toFixed(1)}%`;
            })()}
          </span>
        </div>
        {includeCash && (
          <div className="mt-1 text-xs text-muted-foreground">
            Cash: {(() => {
              const total = Object.values(tempWeights).reduce((sum, w) => sum + w, 0) * 100;
              return `${Math.max(0, 100 - total).toFixed(1)}%`;
            })()}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mb-4 flex gap-2">
        <Button
          onClick={onApplyWeights}
          className="flex-1 bg-dashboard-accent hover:bg-dashboard-accent/80 text-white"
        >
          Apply Weights
        </Button>
        <Button
          onClick={onResetWeights}
          variant="outline"
          className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          Reset
        </Button>
      </div>

      <div className="max-h-[400px] overflow-y-auto pr-2">
        {filteredStocks.map((stock) => (
          <div
            key={stock.ticker}
            className="py-3 border-b border-slate-800 last:border-b-0"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`stock-${stock.ticker}`}
                  checked={selectedAssets.includes(stock.ticker)}
                  onCheckedChange={(checked) =>
                    onSelectAsset(stock.ticker, checked === true)
                  }
                />
                <div>
                  <label
                    htmlFor={`stock-${stock.ticker}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {stock.ticker}
                  </label>
                  <p className="text-xs text-muted-foreground">{stock.name}</p>
                </div>
              </div>
              <div className="text-sm text-dashboard-accent font-medium">
                ${stock.price.toFixed(2)}
              </div>
            </div>
            
            {selectedAssets.includes(stock.ticker) && (
              <div className="mt-2 ml-6">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-muted-foreground">
                    Weight: {Math.round((tempWeights[stock.ticker] || 0) * 100)}%
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={Math.round((tempWeights[stock.ticker] || 0) * 100)}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      if (value >= 0 && value <= 100) {
                        onWeightChange(stock.ticker, value);
                      }
                    }}
                    className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded-md text-xs"
                  />
                </div>
                <Slider
                  value={[Math.round((tempWeights[stock.ticker] || 0) * 100)]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(value) => onWeightChange(stock.ticker, value[0])}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
