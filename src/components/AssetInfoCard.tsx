
import { CardGradient } from "@/components/ui/card-gradient";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/services/api";
import { ArrowUp, ArrowDown, TrendingUp } from "lucide-react";

interface AssetInfoCardProps {
  ticker: string;
}

export default function AssetInfoCard({ ticker }: AssetInfoCardProps) {
  // Fetch stock data
  const { data: stocksData, isLoading: stocksLoading, error: stocksError } = useQuery({
    queryKey: ['stocks'],
    queryFn: () => apiService.getStocks(),
  });

  // Fetch price history for calculations
  const { data: priceHistoryData, isLoading: priceHistoryLoading, error: priceHistoryError } = useQuery({
    queryKey: ['stock-price-history', ticker, 30],
    queryFn: () => apiService.getStockPriceHistory(ticker, 30),
    enabled: !!ticker,
  });

  // Fetch metrics
  const { data: metricsData, isLoading: metricsLoading, error: metricsError } = useQuery({
    queryKey: ['stock-metrics', ticker],
    queryFn: () => apiService.getStockMetrics(ticker),
    enabled: !!ticker,
  });

  if (stocksLoading || priceHistoryLoading || metricsLoading) {
    return (
      <CardGradient className="h-[120px] flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </CardGradient>
    );
  }

  // Check for errors
  if (stocksError || priceHistoryError || metricsError) {
    return (
      <CardGradient className="h-[120px] flex items-center justify-center">
        <p className="text-dashboard-negative">
          Error loading data: {stocksError?.message || priceHistoryError?.message || metricsError?.message || 'Unknown error'}
        </p>
      </CardGradient>
    );
  }

  // Find the selected stock
  const stock = stocksData?.stocks.find((s) => s.ticker === ticker);
  
  if (!stock) {
    return (
      <CardGradient className="h-[120px] flex items-center justify-center">
        <p className="text-muted-foreground">Stock not found</p>
      </CardGradient>
    );
  }

  // Calculate daily change from price history
  const priceHistory = priceHistoryData?.priceHistory || [];
  let priceChange = 0;
  let priceChangePercent = 0;
  
  if (priceHistory.length >= 2) {
    const lastPrice = priceHistory[priceHistory.length - 1].price;
    const previousPrice = priceHistory[priceHistory.length - 2].price;
    priceChange = lastPrice - previousPrice;
    priceChangePercent = (priceChange / previousPrice) * 100;
  }
  
  const isPositive = priceChange >= 0;
  const metrics = metricsData?.metrics;
  
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
          <div className="text-2xl font-bold">${stock.price.toFixed(2)}</div>
          <div className={`flex items-center justify-end mt-1 ${isPositive ? 'text-dashboard-positive' : 'text-dashboard-negative'}`}>
            {isPositive ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
            <span className="ml-1">${priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)</span>
          </div>
        </div>
      </div>
      
      <div className="mt-4 border-t border-slate-800 pt-4">
        <div className="mb-2">
          <p className="text-xs text-muted-foreground">
            Performance Metrics (Annualized, All Historical Data)
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Market Cap</p>
            <p className="font-medium">${(stock.marketCap / 1e9).toFixed(2)}B</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
            <p className="font-medium text-dashboard-positive">
              {metrics?.sharpeRatio ? metrics.sharpeRatio.toFixed(2) : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Volatility</p>
            <p className="font-medium text-dashboard-negative">
              {metrics?.volatility ? `${metrics.volatility.toFixed(2)}%` : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Returns</p>
            <p className={`font-medium ${metrics?.returns && metrics.returns > 0 ? 'text-dashboard-positive' : 'text-dashboard-negative'}`}>
              {metrics?.returns ? `${metrics.returns > 0 ? '+' : ''}${metrics.returns.toFixed(2)}%` : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Max Drawdown</p>
            <p className="font-medium text-dashboard-negative">
              {metrics?.maxDrawdown ? `${metrics.maxDrawdown.toFixed(2)}%` : 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </CardGradient>
  );
}
