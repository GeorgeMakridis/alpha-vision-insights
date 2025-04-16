
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockStocks } from "@/data/mockData";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AssetSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function AssetSelector({ value, onChange }: AssetSelectorProps) {
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
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a stock" />
        </SelectTrigger>
        <SelectContent>
          {mockStocks.map((stock) => (
            <SelectItem key={stock.ticker} value={stock.ticker}>
              {stock.ticker} - {stock.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
