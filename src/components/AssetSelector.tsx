
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/services/api";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AssetSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function AssetSelector({ value, onChange }: AssetSelectorProps) {
  // Fetch stocks data from API
  const { data: stocksData, isLoading, error } = useQuery({
    queryKey: ['stocks'],
    queryFn: () => apiService.getStocks(),
  });

  const stocks = stocksData?.stocks || [];

  return (
    <div className="w-full max-w-xs space-y-2">
      <div className="flex items-center gap-2 justify-end">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center text-muted-foreground text-xs cursor-help">
                <Info className="h-3 w-3 mr-1" />
                <span>Analysis information</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">
                Portfolio metrics are calculated as weighted averages based on your allocation. 
                VaR breaches show when actual losses exceeded predicted VaR thresholds.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Select value={value} onValueChange={onChange} disabled={isLoading || !!error}>
        <SelectTrigger className="w-full">
          <SelectValue 
            placeholder={
              error 
                ? "Error loading stocks" 
                : isLoading 
                  ? "Loading stocks..." 
                  : "Select a stock"
            } 
          />
        </SelectTrigger>
        <SelectContent>
          {error ? (
            <SelectItem value="error" disabled>
              Error: {error.message || 'Failed to load stocks'}
            </SelectItem>
          ) : (
            stocks.map((stock) => (
              <SelectItem key={stock.ticker} value={stock.ticker}>
                {stock.ticker} - {stock.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      {error && (
        <p className="text-xs text-dashboard-negative mt-1">
          Unable to load stocks. Please check your connection.
        </p>
      )}
    </div>
  );
}
