
import { CardGradient } from "@/components/ui/card-gradient";
import { mockStocks, formatPercent } from "@/data/mockData";
import { BarChart, TrendingUp, Activity, ArrowDownRight } from "lucide-react";

interface MetricsSummaryCardProps {
  ticker: string;
}

export default function MetricsSummaryCard({ ticker }: MetricsSummaryCardProps) {
  // Find the selected stock
  const stock = mockStocks.find((s) => s.ticker === ticker);
  
  if (!stock) {
    return (
      <CardGradient className="h-[240px] flex items-center justify-center">
        <p className="text-muted-foreground">Please select a stock</p>
      </CardGradient>
    );
  }
  
  const { metrics } = stock;
  
  // Determine classes based on value
  const getColorClass = (value: number) => {
    return value >= 0 ? 'text-dashboard-positive' : 'text-dashboard-negative';
  };
  
  return (
    <CardGradient>
      <div className="flex items-center gap-2 mb-4">
        <BarChart className="text-dashboard-accent h-5 w-5" />
        <h3 className="text-lg font-medium">Performance Metrics</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        {/* Sharpe Ratio */}
        <div className="col-span-1">
          <div className="flex items-start gap-3">
            <div className="mt-1 p-2 bg-slate-800/60 rounded-md">
              <TrendingUp className="h-4 w-4 text-dashboard-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
              <p className={`text-lg font-semibold ${metrics.sharpeRatio >= 1 ? 'text-dashboard-positive' : metrics.sharpeRatio >= 0 ? 'text-yellow-500' : 'text-dashboard-negative'}`}>
                {metrics.sharpeRatio.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.sharpeRatio >= 1 
                  ? 'Excellent risk-adjusted return' 
                  : metrics.sharpeRatio >= 0 
                    ? 'Average risk-adjusted return' 
                    : 'Poor risk-adjusted return'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Volatility */}
        <div className="col-span-1">
          <div className="flex items-start gap-3">
            <div className="mt-1 p-2 bg-slate-800/60 rounded-md">
              <Activity className="h-4 w-4 text-dashboard-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Volatility</p>
              <p className="text-lg font-semibold">
                {metrics.volatility.toFixed(2)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.volatility < 15 
                  ? 'Low price fluctuation' 
                  : metrics.volatility < 30 
                    ? 'Moderate price fluctuation' 
                    : 'High price fluctuation'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Returns */}
        <div className="col-span-1">
          <div className="flex items-start gap-3">
            <div className="mt-1 p-2 bg-slate-800/60 rounded-md">
              <TrendingUp className={`h-4 w-4 ${getColorClass(metrics.returns)}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Returns</p>
              <p className={`text-lg font-semibold ${getColorClass(metrics.returns)}`}>
                {formatPercent(metrics.returns)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.returns > 0 
                  ? 'Positive performance' 
                  : 'Negative performance'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Maximum Drawdown */}
        <div className="col-span-1">
          <div className="flex items-start gap-3">
            <div className="mt-1 p-2 bg-slate-800/60 rounded-md">
              <ArrowDownRight className="h-4 w-4 text-dashboard-negative" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Maximum Drawdown</p>
              <p className="text-lg font-semibold text-dashboard-negative">
                {metrics.maxDrawdown.toFixed(2)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.abs(metrics.maxDrawdown) < 10 
                  ? 'Low historical decline' 
                  : Math.abs(metrics.maxDrawdown) < 20 
                    ? 'Moderate historical decline' 
                    : 'Severe historical decline'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </CardGradient>
  );
}
