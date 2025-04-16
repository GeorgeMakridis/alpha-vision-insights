
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockStocks } from "@/data/mockData";

interface AssetSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function AssetSelector({ value, onChange }: AssetSelectorProps) {
  return (
    <div className="w-full max-w-xs">
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
