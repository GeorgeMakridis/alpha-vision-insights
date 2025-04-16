
import { mockStocks } from "@/data/mockData";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";

interface PortfolioAssetSelectorProps {
  selectedAssets: string[];
  weights: Record<string, number>;
  onSelectAsset: (ticker: string, selected: boolean) => void;
  onWeightChange: (ticker: string, weight: number) => void;
}

export default function PortfolioAssetSelector({
  selectedAssets,
  weights,
  onSelectAsset,
  onWeightChange,
}: PortfolioAssetSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter stocks based on search query
  const filteredStocks = mockStocks.filter(
    (stock) =>
      stock.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                    Weight: {(weights[stock.ticker] * 100).toFixed(0)}%
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={(weights[stock.ticker] * 100).toFixed(0)}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value >= 1 && value <= 100) {
                        onWeightChange(stock.ticker, value / 100);
                      }
                    }}
                    className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded-md text-xs"
                  />
                </div>
                <Slider
                  value={[weights[stock.ticker] * 100]}
                  min={1}
                  max={100}
                  step={1}
                  onValueChange={(value) => onWeightChange(stock.ticker, value[0] / 100)}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
