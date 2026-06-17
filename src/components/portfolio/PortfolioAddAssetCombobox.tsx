
import { useState } from "react";
import { ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Stock } from "@/services/api";

interface PortfolioAddAssetComboboxProps {
  stocks: Stock[];
  selectedAssets: string[];
  onSelectAsset: (ticker: string, selected: boolean) => void;
}

export default function PortfolioAddAssetCombobox({
  stocks,
  selectedAssets,
  onSelectAsset,
}: PortfolioAddAssetComboboxProps) {
  const [open, setOpen] = useState(false);

  const availableStocks = stocks.filter((s) => !selectedAssets.includes(s.ticker));

  const handleSelect = (ticker: string) => {
    onSelectAsset(ticker, true);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between border-slate-700 bg-slate-900/50 text-slate-200 hover:bg-slate-800 h-9 text-sm font-normal"
        >
          <span className="flex items-center gap-2 text-muted-foreground">
            <Plus className="h-4 w-4 shrink-0" />
            Add holding…
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 bg-slate-900 border-slate-700 z-50"
        align="start"
      >
        <Command className="bg-slate-900">
          <CommandInput placeholder="Search ticker or company…" className="h-9" />
          <CommandList>
            <CommandEmpty>No stock found.</CommandEmpty>
            <CommandGroup>
              {availableStocks.map((stock) => (
                <CommandItem
                  key={stock.ticker}
                  value={`${stock.ticker} ${stock.name}`}
                  onSelect={() => handleSelect(stock.ticker)}
                  className="cursor-pointer"
                >
                  <span className="font-medium">{stock.ticker}</span>
                  <span className="text-muted-foreground truncate ml-2 text-xs">
                    {stock.name}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            {availableStocks.length === 0 && stocks.length > 0 && (
              <p className="py-3 px-3 text-xs text-muted-foreground text-center">
                All available stocks are already in your portfolio.
              </p>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
