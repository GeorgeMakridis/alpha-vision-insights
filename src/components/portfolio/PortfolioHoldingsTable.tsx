
import { X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Stock } from "@/services/api";
import { cn } from "@/lib/utils";

interface PortfolioHoldingsTableProps {
  selectedAssets: string[];
  tempWeights: Record<string, number>;
  stocks: Stock[];
  onWeightChange: (ticker: string, weight: number) => void;
  onRemoveAsset: (ticker: string) => void;
}

export default function PortfolioHoldingsTable({
  selectedAssets,
  tempWeights,
  stocks,
  onWeightChange,
  onRemoveAsset,
}: PortfolioHoldingsTableProps) {
  const stockByTicker = new Map(stocks.map((s) => [s.ticker, s]));

  const sortedTickers = [...selectedAssets].sort(
    (a, b) => (tempWeights[b] ?? 0) - (tempWeights[a] ?? 0)
  );

  if (selectedAssets.length === 0) {
    return (
      <div className="py-6 px-2 text-center text-sm text-muted-foreground border border-dashed border-slate-700 rounded-md">
        <p>No holdings yet.</p>
        <p className="text-xs mt-1">Use Add holding below to build your portfolio.</p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-xs text-muted-foreground h-8">Holding</TableHead>
              <TableHead className="text-xs text-muted-foreground h-8 w-[88px] text-right">
                Weight %
              </TableHead>
              <TableHead className="h-8 w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTickers.map((ticker) => {
              const stock = stockByTicker.get(ticker);
              const pct = Math.round((tempWeights[ticker] ?? 0) * 100);
              return (
                <TableRow key={ticker} className="border-slate-800">
                  <TableCell className="py-2">
                    <div className="font-medium text-sm">{ticker}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[140px]">
                      {stock?.name ?? ticker}
                    </div>
                  </TableCell>
                  <TableCell className="py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={pct}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10) || 0;
                        if (value >= 0 && value <= 100) {
                          onWeightChange(ticker, value);
                        }
                      }}
                      className="w-14 px-2 py-1 bg-slate-900 border border-slate-700 rounded-md text-xs text-right tabular-nums"
                      aria-label={`Weight for ${ticker}`}
                    />
                  </TableCell>
                  <TableCell className="py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-dashboard-negative"
                      onClick={() => onRemoveAsset(ticker)}
                      aria-label={`Remove ${ticker}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="sm:hidden space-y-3">
        {sortedTickers.map((ticker) => {
          const stock = stockByTicker.get(ticker);
          const pct = Math.round((tempWeights[ticker] ?? 0) * 100);
          return (
            <div
              key={ticker}
              className={cn(
                "rounded-md border border-slate-800 bg-slate-900/40 p-3 space-y-2"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-sm">{ticker}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {stock?.name ?? ticker}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-dashboard-negative"
                  onClick={() => onRemoveAsset(ticker)}
                  aria-label={`Remove ${ticker}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={pct}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10) || 0;
                    if (value >= 0 && value <= 100) {
                      onWeightChange(ticker, value);
                    }
                  }}
                  className="w-14 px-2 py-1 bg-slate-900 border border-slate-700 rounded-md text-xs tabular-nums"
                  aria-label={`Weight for ${ticker}`}
                />
                <span className="text-xs text-muted-foreground">%</span>
                <div className="flex-1 min-w-0">
                  <Slider
                    value={[pct]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(value) => onWeightChange(ticker, value[0])}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground mt-2 px-0.5">
        Adding a holding redistributes equal draft weights across all holdings until you Apply.
      </p>
    </>
  );
}
