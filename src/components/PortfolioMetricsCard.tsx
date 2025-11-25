
import { CardGradient } from "@/components/ui/card-gradient";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/services/api";
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
  // Fetch portfolio metrics from API
  const { data: portfolioData, isLoading, error } = useQuery({
    queryKey: ['portfolio-metrics', selectedAssets, weights],
    queryFn: () => apiService.getPortfolioMetrics(selectedAssets, weights),
    enabled: selectedAssets.length > 0 && Object.keys(weights).length > 0,
  });

  if (selectedAssets.length === 0) {
    return (
      <CardGradient className="h-[240px] flex flex-col items-center justify-center">
        <AlertTriangle className="h-8 w-8 text-yellow-500 mb-2" />
        <p className="text-muted-foreground">Please select at least one asset</p>
      </CardGradient>
    );
  }

  if (isLoading) {
    return (
      <CardGradient className="h-[240px] flex items-center justify-center">
        <p className="text-muted-foreground">Loading portfolio metrics...</p>
      </CardGradient>
    );
  }

  if (error) {
    return (
      <CardGradient className="h-[240px] flex flex-col items-center justify-center">
        <AlertTriangle className="h-8 w-8 text-dashboard-negative mb-2" />
        <p className="text-dashboard-negative text-center">
          Error loading portfolio metrics: {error.message || 'Unknown error'}
        </p>
      </CardGradient>
    );
  }

  if (!portfolioData?.metrics) {
    return (
      <CardGradient className="h-[240px] flex items-center justify-center">
        <p className="text-muted-foreground">No portfolio data available</p>
      </CardGradient>
    );
  }

  const metrics = portfolioData.metrics;
  
  // Get real backtesting statistics from API
  const backtesting = portfolioData.backtesting || {};
  
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
                <p className="text-lg font-semibold text-dashboard-positive">
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
                <p className="text-lg font-semibold text-dashboard-negative">
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
                <p className="text-lg font-semibold text-dashboard-positive">
                  {metrics.returns.toFixed(2)}%
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
                            <span className="text-xs font-medium text-red-400">{backtesting.parametricVaR95?.breachCount || 0}</span>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-dashboard-negative">
                          -{metrics.parametricVaR95.toFixed(2)}%
                        </p>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <h4 className="text-sm font-medium mb-2">Parametric VaR (95%)</h4>
                      <p className="text-xs text-muted-foreground mb-3">Value at Risk using normal distribution assumption at 95% confidence level.</p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span>Breaches:</span>
                          <span className="font-medium text-red-400">{backtesting.parametricVaR95?.breachCount || 0} of {backtesting.parametricVaR95?.totalDays || 0} days</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span>Rating:</span>
                          <span className="font-medium">{getVaRRating(backtesting.parametricVaR95?.breachCount || 0, '95')}</span>
                        </div>
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
                            <span className="text-xs font-medium text-red-400">{backtesting.monteCarloVaR95?.breachCount || 0}</span>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-dashboard-negative">
                          -{metrics.monteCarloVaR95.toFixed(2)}%
                        </p>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <h4 className="text-sm font-medium mb-2">Monte Carlo VaR (95%)</h4>
                      <p className="text-xs text-muted-foreground mb-3">Value at Risk using Monte Carlo simulation at 95% confidence level.</p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span>Breaches:</span>
                          <span className="font-medium text-red-400">{backtesting.monteCarloVaR95?.breachCount || 0} of {backtesting.monteCarloVaR95?.totalDays || 0} days</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span>Rating:</span>
                          <span className="font-medium">{getVaRRating(backtesting.monteCarloVaR95?.breachCount || 0, '95')}</span>
                        </div>
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
                            <span className="text-xs font-medium text-red-400">{backtesting.deepVaR95?.breachCount || 0}</span>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-dashboard-negative">
                          -{metrics.deepVaR95.toFixed(2)}%
                        </p>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <h4 className="text-sm font-medium mb-2">Deep VaR (95%)</h4>
                      <p className="text-xs text-muted-foreground mb-3">Value at Risk using deep learning model at 95% confidence level.</p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span>Breaches:</span>
                          <span className="font-medium text-red-400">{backtesting.deepVaR95?.breachCount || 0} of {backtesting.deepVaR95?.totalDays || 0} days</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span>Rating:</span>
                          <span className="font-medium">{getVaRRating(backtesting.deepVaR95?.breachCount || 0, '95')}</span>
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                  
                  <HoverCard>
                    <HoverCardTrigger className="w-full">
                      <div className="p-2 rounded-md hover:bg-slate-700/30 transition-colors">
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-muted-foreground">BLNNVaR</p>
                          <div className="flex items-center">
                            <CircleAlert className="h-3 w-3 text-dashboard-negative mr-1" />
                            <span className="text-xs font-medium text-red-400">{backtesting.blnnVaR95?.breachCount || 0}</span>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-dashboard-negative">
                          -{metrics.blnnVaR95.toFixed(2)}%
                        </p>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <h4 className="text-sm font-medium mb-2">BLNNVaR (95%)</h4>
                      <p className="text-xs text-muted-foreground mb-3">Value at Risk using Bayesian LSTM Neural Network at 95% confidence level.</p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span>Breaches:</span>
                          <span className="font-medium text-red-400">{backtesting.blnnVaR95?.breachCount || 0} of {backtesting.blnnVaR95?.totalDays || 0} days</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span>Rating:</span>
                          <span className="font-medium">{getVaRRating(backtesting.blnnVaR95?.breachCount || 0, '95')}</span>
                        </div>
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
                            <span className="text-xs font-medium text-red-400">{backtesting.parametricVaR99?.breachCount || 0}</span>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-dashboard-negative">
                          -{metrics.parametricVaR99.toFixed(2)}%
                        </p>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <h4 className="text-sm font-medium mb-2">Parametric VaR (99%)</h4>
                      <p className="text-xs text-muted-foreground mb-3">Value at Risk using normal distribution assumption at 99% confidence level.</p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span>Breaches:</span>
                          <span className="font-medium text-red-400">{backtesting.parametricVaR99?.breachCount || 0} of {backtesting.parametricVaR99?.totalDays || 0} days</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span>Rating:</span>
                          <span className="font-medium">{getVaRRating(backtesting.parametricVaR99?.breachCount || 0, '99')}</span>
                        </div>
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
                            <span className="text-xs font-medium text-red-400">{backtesting.monteCarloVaR99?.breachCount || 0}</span>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-dashboard-negative">
                          -{metrics.monteCarloVaR99.toFixed(2)}%
                        </p>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <h4 className="text-sm font-medium mb-2">Monte Carlo VaR (99%)</h4>
                      <p className="text-xs text-muted-foreground mb-3">Value at Risk using Monte Carlo simulation at 99% confidence level.</p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span>Breaches:</span>
                          <span className="font-medium text-red-400">{backtesting.monteCarloVaR99?.breachCount || 0} of {backtesting.monteCarloVaR99?.totalDays || 0} days</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span>Rating:</span>
                          <span className="font-medium">{getVaRRating(backtesting.monteCarloVaR99?.breachCount || 0, '99')}</span>
                        </div>
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
                            <span className="text-xs font-medium text-red-400">{backtesting.deepVaR99?.breachCount || 0}</span>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-dashboard-negative">
                          -{metrics.deepVaR99.toFixed(2)}%
                        </p>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <h4 className="text-sm font-medium mb-2">Deep VaR (99%)</h4>
                      <p className="text-xs text-muted-foreground mb-3">Value at Risk using deep learning model at 99% confidence level.</p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span>Breaches:</span>
                          <span className="font-medium text-red-400">{backtesting.deepVaR99?.breachCount || 0} of {backtesting.deepVaR99?.totalDays || 0} days</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span>Rating:</span>
                          <span className="font-medium">{getVaRRating(backtesting.deepVaR99?.breachCount || 0, '99')}</span>
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                  
                  <HoverCard>
                    <HoverCardTrigger className="w-full">
                      <div className="p-2 rounded-md hover:bg-slate-700/30 transition-colors">
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-muted-foreground">BLNNVaR</p>
                          <div className="flex items-center">
                            <CircleAlert className="h-3 w-3 text-dashboard-negative mr-1" />
                            <span className="text-xs font-medium text-red-400">{backtesting.blnnVaR99?.breachCount || 0}</span>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-dashboard-negative">
                          -{metrics.blnnVaR99.toFixed(2)}%
                        </p>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <h4 className="text-sm font-medium mb-2">BLNNVaR (99%)</h4>
                      <p className="text-xs text-muted-foreground mb-3">Value at Risk using Bayesian LSTM Neural Network at 99% confidence level.</p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span>Breaches:</span>
                          <span className="font-medium text-red-400">{backtesting.blnnVaR99?.breachCount || 0} of {backtesting.blnnVaR99?.totalDays || 0} days</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span>Rating:</span>
                          <span className="font-medium">{getVaRRating(backtesting.blnnVaR99?.breachCount || 0, '99')}</span>
                        </div>
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
