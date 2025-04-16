
import { CardGradient } from "@/components/ui/card-gradient";
import { calculatePortfolioMetrics, formatPercent, mockStocks } from "@/data/mockData";
import { AlertTriangle, BarChart, TrendingUp, Activity, ShieldAlert } from "lucide-react";

interface PortfolioMetricsCardProps {
  selectedAssets: string[];
  weights: Record<string, number>;
}

export default function PortfolioMetricsCard({
  selectedAssets,
  weights,
}: PortfolioMetricsCardProps) {
  if (selectedAssets.length === 0) {
    return (
      <CardGradient className="h-[240px] flex flex-col items-center justify-center">
        <AlertTriangle className="h-8 w-8 text-yellow-500 mb-2" />
        <p className="text-muted-foreground">Please select at least one asset</p>
      </CardGradient>
    );
  }
  
  // Calculate portfolio metrics including weighted VaR
  const metrics = calculatePortfolioMetrics(selectedAssets, weights);
  
  // Calculate weighted VaR breach statistics (number of breaches)
  const varBreaches = {
    parametricVaR95: Math.floor(Math.random() * 10), // Simulated data
    monteCarloVaR95: Math.floor(Math.random() * 8),
    deepVaR95: Math.floor(Math.random() * 6),
    parametricVaR99: Math.floor(Math.random() * 5),
    monteCarloVaR99: Math.floor(Math.random() * 3),
    deepVaR99: Math.floor(Math.random() * 2)
  };
  
  // Determine classes based on value
  const getColorClass = (value: number) => {
    return value >= 0 ? 'text-dashboard-positive' : 'text-dashboard-negative';
  };
  
  return (
    <CardGradient>
      <div className="flex items-center gap-2 mb-4">
        <BarChart className="text-dashboard-accent h-5 w-5" />
        <h3 className="text-lg font-medium">Portfolio Metrics</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
        {/* Portfolio Performance */}
        <div className="col-span-1">
          <h4 className="text-sm font-medium mb-3">Performance Metrics</h4>
          
          <div className="space-y-4">
            {/* Sharpe Ratio */}
            <div className="flex items-start gap-3">
              <div className="mt-1 p-2 bg-slate-800/60 rounded-md">
                <TrendingUp className="h-4 w-4 text-dashboard-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
                <p className={`text-lg font-semibold ${metrics.sharpeRatio >= 1 ? 'text-dashboard-positive' : metrics.sharpeRatio >= 0 ? 'text-yellow-500' : 'text-dashboard-negative'}`}>
                  {metrics.sharpeRatio.toFixed(2)}
                </p>
              </div>
            </div>
            
            {/* Volatility */}
            <div className="flex items-start gap-3">
              <div className="mt-1 p-2 bg-slate-800/60 rounded-md">
                <Activity className="h-4 w-4 text-dashboard-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Volatility</p>
                <p className="text-lg font-semibold">
                  {metrics.volatility.toFixed(2)}%
                </p>
              </div>
            </div>
            
            {/* Returns */}
            <div className="flex items-start gap-3">
              <div className="mt-1 p-2 bg-slate-800/60 rounded-md">
                <TrendingUp className={`h-4 w-4 ${getColorClass(metrics.returns)}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Returns</p>
                <p className={`text-lg font-semibold ${getColorClass(metrics.returns)}`}>
                  {formatPercent(metrics.returns)}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Portfolio VaR */}
        <div className="col-span-1">
          <h4 className="text-sm font-medium mb-3">Value at Risk (VaR)</h4>
          
          <div className="grid grid-cols-2 gap-4">
            {/* 95% Confidence */}
            <div className="col-span-1">
              <div className="bg-slate-800/50 rounded-lg p-3 h-full">
                <h5 className="text-xs font-medium text-muted-foreground mb-2">95% Confidence</h5>
                
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-muted-foreground">Parametric</p>
                      <span className="text-xs font-medium text-red-400">{varBreaches.parametricVaR95} breach{varBreaches.parametricVaR95 !== 1 ? 'es' : ''}</span>
                    </div>
                    <p className="text-sm font-semibold text-dashboard-negative">
                      -{metrics.parametricVaR95.toFixed(2)}%
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-muted-foreground">Monte Carlo</p>
                      <span className="text-xs font-medium text-red-400">{varBreaches.monteCarloVaR95} breach{varBreaches.monteCarloVaR95 !== 1 ? 'es' : ''}</span>
                    </div>
                    <p className="text-sm font-semibold text-dashboard-negative">
                      -{metrics.monteCarloVaR95.toFixed(2)}%
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-muted-foreground">DeepVaR</p>
                      <span className="text-xs font-medium text-red-400">{varBreaches.deepVaR95} breach{varBreaches.deepVaR95 !== 1 ? 'es' : ''}</span>
                    </div>
                    <p className="text-sm font-semibold text-dashboard-negative">
                      -{metrics.deepVaR95.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 99% Confidence */}
            <div className="col-span-1">
              <div className="bg-slate-800/50 rounded-lg p-3 h-full">
                <h5 className="text-xs font-medium text-muted-foreground mb-2">99% Confidence</h5>
                
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-muted-foreground">Parametric</p>
                      <span className="text-xs font-medium text-red-400">{varBreaches.parametricVaR99} breach{varBreaches.parametricVaR99 !== 1 ? 'es' : ''}</span>
                    </div>
                    <p className="text-sm font-semibold text-dashboard-negative">
                      -{metrics.parametricVaR99.toFixed(2)}%
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-muted-foreground">Monte Carlo</p>
                      <span className="text-xs font-medium text-red-400">{varBreaches.monteCarloVaR99} breach{varBreaches.monteCarloVaR99 !== 1 ? 'es' : ''}</span>
                    </div>
                    <p className="text-sm font-semibold text-dashboard-negative">
                      -{metrics.monteCarloVaR99.toFixed(2)}%
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-muted-foreground">DeepVaR</p>
                      <span className="text-xs font-medium text-red-400">{varBreaches.deepVaR99} breach{varBreaches.deepVaR99 !== 1 ? 'es' : ''}</span>
                    </div>
                    <p className="text-sm font-semibold text-dashboard-negative">
                      -{metrics.deepVaR99.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CardGradient>
  );
}
