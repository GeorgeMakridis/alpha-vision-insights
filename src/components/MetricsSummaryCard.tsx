
import { CardGradient } from "@/components/ui/card-gradient";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/services/api";
import { BarChart, TrendingUp, Activity, ArrowDownRight } from "lucide-react";

interface MetricsSummaryCardProps {
  ticker: string;
}

export default function MetricsSummaryCard({ ticker }: MetricsSummaryCardProps) {
  // Fetch metrics data from API
  const { data: metricsData, isLoading, error } = useQuery({
    queryKey: ['stock-metrics', ticker],
    queryFn: () => apiService.getStockMetrics(ticker),
    enabled: !!ticker,
  });
  
  if (isLoading) {
    return (
      <CardGradient className="h-[240px] flex items-center justify-center">
        <p className="text-muted-foreground">Loading metrics...</p>
      </CardGradient>
    );
  }
  
  if (error) {
    return (
      <CardGradient className="h-[240px] flex items-center justify-center">
        <p className="text-dashboard-negative">
          Error loading metrics: {error.message || 'Unknown error'}
        </p>
      </CardGradient>
    );
  }
  
  if (!metricsData?.metrics) {
    return (
      <CardGradient className="h-[240px] flex items-center justify-center">
        <p className="text-muted-foreground">No metrics available for {ticker}</p>
      </CardGradient>
    );
  }
  
  const metrics = metricsData.metrics;
  
  // Determine classes based on value
  const getColorClass = (value: number) => {
    return value >= 0 ? 'text-dashboard-positive' : 'text-dashboard-negative';
  };
  
  return (
    <CardGradient className="h-auto">
      <div className="flex items-center gap-2 mb-3">
        <BarChart className="text-dashboard-accent h-4 w-4" />
        <h3 className="text-base font-medium">Performance Metrics</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {/* Sharpe Ratio */}
        <div className="col-span-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3 w-3 text-dashboard-accent" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Sharpe Ratio</p>
              <p className="text-base font-semibold text-dashboard-positive">
                {metrics.sharpeRatio.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        
        {/* Volatility */}
        <div className="col-span-1">
          <div className="flex items-center gap-2">
            <Activity className="h-3 w-3 text-dashboard-accent" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Volatility</p>
              <p className="text-base font-semibold text-dashboard-negative">
                {metrics.volatility.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
        
        {/* Returns */}
        <div className="col-span-1">
          <div className="flex items-center gap-2">
            <TrendingUp className={`h-3 w-3 ${getColorClass(metrics.returns)}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Returns</p>
              <p className="text-base font-semibold text-dashboard-positive">
                {metrics.returns > 0 ? '+' : ''}{metrics.returns.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
        
        {/* Maximum Drawdown */}
        <div className="col-span-1">
          <div className="flex items-center gap-2">
            <ArrowDownRight className="h-3 w-3 text-dashboard-negative" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Max Drawdown</p>
              <p className="text-base font-semibold text-dashboard-negative">
                {metrics.maxDrawdown.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </CardGradient>
  );
}
