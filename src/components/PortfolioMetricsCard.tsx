
import { CardGradient } from "@/components/ui/card-gradient";
import { calculatePortfolioMetrics, formatPercent, mockStocks } from "@/data/mockData";
import { AlertTriangle, BarChart, TrendingUp, Activity, ShieldAlert, Info, CircleAlert } from "lucide-react";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

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
  
  // Get VaR rating description
  const getVaRRating = (breaches: number, confidence: '95' | '99') => {
    if (confidence === '95') {
      if (breaches <= 3) return 'Good: Breaches within expected range';
      if (breaches <= 7) return 'Average: Slightly more breaches than expected';
      return 'Poor: Significantly more breaches than expected';
    } else { // 99%
      if (breaches <= 1) return 'Good: Breaches within expected range';
      if (breaches <= 3) return 'Average: Slightly more breaches than expected';
      return 'Poor: Significantly more breaches than expected';
    }
  };
  
  return (
    <CardGradient>
      <div className="flex items-center gap-2 mb-4">
        <BarChart className="text-dashboard-accent h-5 w-5" />
        <h3 className="text-lg font-medium">Portfolio Metrics</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Portfolio metrics are calculated as weighted averages of individual asset metrics based on portfolio allocation.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
        {/* Portfolio Performance */}
        <div className="col-span-1">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            Performance Metrics
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Key metrics that measure portfolio performance and risk characteristics.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </h4>
          
          <div className="space-y-4">
            {/* Sharpe Ratio */}
            <div className="flex items-start gap-3">
              <div className="mt-1 p-2 bg-slate-800/60 rounded-md">
                <TrendingUp className="h-4 w-4 text-dashboard-accent" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <h4 className="text-sm font-medium mb-1">Sharpe Ratio</h4>
                      <p className="text-xs text-muted-foreground mb-2">Measures risk-adjusted return by dividing excess return by standard deviation of returns.</p>
                      <div className="text-xs grid grid-cols-3 gap-1">
                        <div className="flex items-center gap-1 col-span-1">
                          <div className="w-2 h-2 rounded-full bg-dashboard-negative"></div>
                          <span>Below 0</span>
                        </div>
                        <div className="flex items-center gap-1 col-span-1">
                          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                          <span>0 to 1</span>
                        </div>
                        <div className="flex items-center gap-1 col-span-1">
                          <div className="w-2 h-2 rounded-full bg-dashboard-positive"></div>
                          <span>Above 1</span>
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </div>
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
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <p className="text-sm text-muted-foreground">Volatility</p>
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <h4 className="text-sm font-medium mb-1">Volatility</h4>
                      <p className="text-xs text-muted-foreground mb-2">Standard deviation of returns, measuring how much prices fluctuate over time.</p>
                      <div className="text-xs grid grid-cols-3 gap-1">
                        <div className="flex items-center gap-1 col-span-1">
                          <div className="w-2 h-2 rounded-full bg-dashboard-positive"></div>
                          <span>Under 15%</span>
                        </div>
                        <div className="flex items-center gap-1 col-span-1">
                          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                          <span>15-30%</span>
                        </div>
                        <div className="flex items-center gap-1 col-span-1">
                          <div className="w-2 h-2 rounded-full bg-dashboard-negative"></div>
                          <span>Above 30%</span>
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </div>
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
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <p className="text-sm text-muted-foreground">Returns</p>
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <h4 className="text-sm font-medium mb-1">Returns</h4>
                      <p className="text-xs text-muted-foreground">Percentage change in portfolio value over the selected time period.</p>
                    </HoverCardContent>
                  </HoverCard>
                </div>
                <p className={`text-lg font-semibold ${getColorClass(metrics.returns)}`}>
                  {formatPercent(metrics.returns)}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Portfolio VaR */}
        <div className="col-span-1">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            Value at Risk (VaR)
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Maximum expected loss with specific confidence levels (95% or 99%). "Breaches" indicate when actual losses exceeded VaR predictions.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </h4>
          
          <div className="grid grid-cols-2 gap-4">
            {/* 95% Confidence */}
            <div className="col-span-1">
              <div className="bg-slate-800/50 rounded-lg p-3 h-full">
                <h5 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  95% Confidence
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Expected to be exceeded 5% of the time (about 1 day per month)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </h5>
                
                <div className="space-y-2">
                  <HoverCard>
                    <HoverCardTrigger className="w-full">
                      <div className="p-2 rounded-md hover:bg-slate-700/30 transition-colors">
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-muted-foreground">Parametric</p>
                          <div className="flex items-center">
                            <CircleAlert className="h-3 w-3 text-dashboard-negative mr-1" />
                            <span className="text-xs font-medium text-red-400">{varBreaches.parametricVaR95}</span>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-dashboard-negative">
                          -{metrics.parametricVaR95.toFixed(2)}%
                        </p>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-72">
                      <h4 className="text-sm font-medium mb-1">Parametric VaR (95%)</h4>
                      <p className="text-xs text-muted-foreground mb-2">Uses normal distribution assumptions to calculate potential losses.</p>
                      <div className="flex justify-between items-center text-xs">
                        <span>VaR Level:</span>
                        <span className="font-medium text-dashboard-negative">-{metrics.parametricVaR95.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between items-center text-xs mt-1">
                        <span>Breaches:</span>
                        <span className="font-medium text-red-400">{varBreaches.parametricVaR95} of last 100 days</span>
                      </div>
                      <div className="flex justify-between items-center text-xs mt-1">
                        <span>Rating:</span>
                        <span className="font-medium">{getVaRRating(varBreaches.parametricVaR95, '95')}</span>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                  
                  <HoverCard>
                    <HoverCardTrigger className="w-full">
                      <div className="p-2 rounded-md hover:bg-slate-700/30 transition-colors">
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-muted-foreground">Monte Carlo</p>
                          <div className="flex items-center">
                            <CircleAlert className="h-3 w-3 text-dashboard-negative mr-1" />
                            <span className="text-xs font-medium text-red-400">{varBreaches.monteCarloVaR95}</span>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-dashboard-negative">
                          -{metrics.monteCarloVaR95.toFixed(2)}%
                        </p>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-72">
                      <h4 className="text-sm font-medium mb-1">Monte Carlo VaR (95%)</h4>
                      <p className="text-xs text-muted-foreground mb-2">Uses simulations to model potential price paths and calculate losses.</p>
                      <div className="flex justify-between items-center text-xs">
                        <span>VaR Level:</span>
                        <span className="font-medium text-dashboard-negative">-{metrics.monteCarloVaR95.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between items-center text-xs mt-1">
                        <span>Breaches:</span>
                        <span className="font-medium text-red-400">{varBreaches.monteCarloVaR95} of last 100 days</span>
                      </div>
                      <div className="flex justify-between items-center text-xs mt-1">
                        <span>Rating:</span>
                        <span className="font-medium">{getVaRRating(varBreaches.monteCarloVaR95, '95')}</span>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                  
                  <HoverCard>
                    <HoverCardTrigger className="w-full">
                      <div className="p-2 rounded-md hover:bg-slate-700/30 transition-colors">
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-muted-foreground">DeepVaR</p>
                          <div className="flex items-center">
                            <CircleAlert className="h-3 w-3 text-dashboard-negative mr-1" />
                            <span className="text-xs font-medium text-red-400">{varBreaches.deepVaR95}</span>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-dashboard-negative">
                          -{metrics.deepVaR95.toFixed(2)}%
                        </p>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-72">
                      <h4 className="text-sm font-medium mb-1">Deep VaR (95%)</h4>
                      <p className="text-xs text-muted-foreground mb-2">Uses neural networks to model complex market behaviors and calculate losses.</p>
                      <div className="flex justify-between items-center text-xs">
                        <span>VaR Level:</span>
                        <span className="font-medium text-dashboard-negative">-{metrics.deepVaR95.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between items-center text-xs mt-1">
                        <span>Breaches:</span>
                        <span className="font-medium text-red-400">{varBreaches.deepVaR95} of last 100 days</span>
                      </div>
                      <div className="flex justify-between items-center text-xs mt-1">
                        <span>Rating:</span>
                        <span className="font-medium">{getVaRRating(varBreaches.deepVaR95, '95')}</span>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </div>
              </div>
            </div>
            
            {/* 99% Confidence */}
            <div className="col-span-1">
              <div className="bg-slate-800/50 rounded-lg p-3 h-full">
                <h5 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  99% Confidence
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Expected to be exceeded 1% of the time (about 2.5 days per year)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </h5>
                
                <div className="space-y-2">
                  <HoverCard>
                    <HoverCardTrigger className="w-full">
                      <div className="p-2 rounded-md hover:bg-slate-700/30 transition-colors">
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-muted-foreground">Parametric</p>
                          <div className="flex items-center">
                            <CircleAlert className="h-3 w-3 text-dashboard-negative mr-1" />
                            <span className="text-xs font-medium text-red-400">{varBreaches.parametricVaR99}</span>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-dashboard-negative">
                          -{metrics.parametricVaR99.toFixed(2)}%
                        </p>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-72">
                      <h4 className="text-sm font-medium mb-1">Parametric VaR (99%)</h4>
                      <p className="text-xs text-muted-foreground mb-2">Uses normal distribution assumptions with higher confidence level.</p>
                      <div className="flex justify-between items-center text-xs">
                        <span>VaR Level:</span>
                        <span className="font-medium text-dashboard-negative">-{metrics.parametricVaR99.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between items-center text-xs mt-1">
                        <span>Breaches:</span>
                        <span className="font-medium text-red-400">{varBreaches.parametricVaR99} of last 100 days</span>
                      </div>
                      <div className="flex justify-between items-center text-xs mt-1">
                        <span>Rating:</span>
                        <span className="font-medium">{getVaRRating(varBreaches.parametricVaR99, '99')}</span>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                  
                  <HoverCard>
                    <HoverCardTrigger className="w-full">
                      <div className="p-2 rounded-md hover:bg-slate-700/30 transition-colors">
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-muted-foreground">Monte Carlo</p>
                          <div className="flex items-center">
                            <CircleAlert className="h-3 w-3 text-dashboard-negative mr-1" />
                            <span className="text-xs font-medium text-red-400">{varBreaches.monteCarloVaR99}</span>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-dashboard-negative">
                          -{metrics.monteCarloVaR99.toFixed(2)}%
                        </p>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-72">
                      <h4 className="text-sm font-medium mb-1">Monte Carlo VaR (99%)</h4>
                      <p className="text-xs text-muted-foreground mb-2">Uses simulations with higher confidence level for tail risk assessment.</p>
                      <div className="flex justify-between items-center text-xs">
                        <span>VaR Level:</span>
                        <span className="font-medium text-dashboard-negative">-{metrics.monteCarloVaR99.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between items-center text-xs mt-1">
                        <span>Breaches:</span>
                        <span className="font-medium text-red-400">{varBreaches.monteCarloVaR99} of last 100 days</span>
                      </div>
                      <div className="flex justify-between items-center text-xs mt-1">
                        <span>Rating:</span>
                        <span className="font-medium">{getVaRRating(varBreaches.monteCarloVaR99, '99')}</span>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                  
                  <HoverCard>
                    <HoverCardTrigger className="w-full">
                      <div className="p-2 rounded-md hover:bg-slate-700/30 transition-colors">
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-muted-foreground">DeepVaR</p>
                          <div className="flex items-center">
                            <CircleAlert className="h-3 w-3 text-dashboard-negative mr-1" />
                            <span className="text-xs font-medium text-red-400">{varBreaches.deepVaR99}</span>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-dashboard-negative">
                          -{metrics.deepVaR99.toFixed(2)}%
                        </p>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-72">
                      <h4 className="text-sm font-medium mb-1">Deep VaR (99%)</h4>
                      <p className="text-xs text-muted-foreground mb-2">Uses neural networks with higher confidence level for extreme tail risk modeling.</p>
                      <div className="flex justify-between items-center text-xs">
                        <span>VaR Level:</span>
                        <span className="font-medium text-dashboard-negative">-{metrics.deepVaR99.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between items-center text-xs mt-1">
                        <span>Breaches:</span>
                        <span className="font-medium text-red-400">{varBreaches.deepVaR99} of last 100 days</span>
                      </div>
                      <div className="flex justify-between items-center text-xs mt-1">
                        <span>Rating:</span>
                        <span className="font-medium">{getVaRRating(varBreaches.deepVaR99, '99')}</span>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CardGradient>
  );
}
