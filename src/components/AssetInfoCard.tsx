
import { CardGradient } from "@/components/ui/card-gradient";
import { mockStocks, formatMarketCap, formatPrice } from "@/data/mockData";
import { ArrowUp, ArrowDown, TrendingUp } from "lucide-react";

interface AssetInfoCardProps {
  ticker: string;
}

export default function AssetInfoCard({ ticker }: AssetInfoCardProps) {
  // Find the selected stock
  const stock = mockStocks.find((s) => s.ticker === ticker);
  
  if (!stock) {
    return (
      <CardGradient className="h-[120px] flex items-center justify-center">
        <p className="text-muted-foreground">Please select a stock</p>
      </CardGradient>
    );
  }
  
  // Calculate daily change
  const priceHistory = stock.priceHistory;
  const lastPrice = priceHistory[priceHistory.length - 1].price;
  const previousPrice = priceHistory[priceHistory.length - 2].price;
  const priceChange = lastPrice - previousPrice;
  const priceChangePercent = (priceChange / previousPrice) * 100;
  const isPositive = priceChange >= 0;
  
  return (
    <CardGradient>
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">{stock.ticker}</h2>
            <span className="text-muted-foreground">{stock.name}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Sector: {stock.sector}</p>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold">{formatPrice(stock.price)}</div>
          <div className={`flex items-center justify-end mt-1 ${isPositive ? 'text-dashboard-positive' : 'text-dashboard-negative'}`}>
            {isPositive ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
            <span className="ml-1">{priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)</span>
          </div>
        </div>
      </div>
      
      <div className="mt-4 border-t border-slate-800 pt-4">
        <div className="flex justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Market Cap</p>
            <p className="font-medium">{formatMarketCap(stock.marketCap)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">30d Trend</p>
            <div className="flex items-center">
              <TrendingUp size={16} className={stock.metrics.returns > 0 ? 'text-dashboard-positive' : 'text-dashboard-negative'} />
              <span className={`ml-1 ${stock.metrics.returns > 0 ? 'text-dashboard-positive' : 'text-dashboard-negative'}`}>
                {stock.metrics.returns > 0 ? '+' : ''}{stock.metrics.returns.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </CardGradient>
  );
}
