
import { CardGradient } from "@/components/ui/card-gradient";
import { mockStocks } from "@/data/mockData";
import { Sparkles, Info } from "lucide-react";
import { 
  HoverCard, 
  HoverCardTrigger, 
  HoverCardContent 
} from "@/components/ui/hover-card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";

interface VaRMetricsCardProps {
  ticker: string;
}

export default function VaRMetricsCard({ ticker }: VaRMetricsCardProps) {
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
  
  // Simulated breach statistics
  const breachStats = {
    parametricVaR95: { 
      breachCount: 7, 
      breachPercentage: 2.3, 
      expectedBreaches: 5.0 
    },
    monteCarloVaR95: { 
      breachCount: 6, 
      breachPercentage: 2.0, 
      expectedBreaches: 5.0 
    },
    deepVaR95: { 
      breachCount: 4, 
      breachPercentage: 1.3, 
      expectedBreaches: 5.0 
    },
    parametricVaR99: { 
      breachCount: 2, 
      breachPercentage: 0.7, 
      expectedBreaches: 1.0 
    },
    monteCarloVaR99: { 
      breachCount: 1, 
      breachPercentage: 0.3, 
      expectedBreaches: 1.0 
    },
    deepVaR99: { 
      breachCount: 0, 
      breachPercentage: 0.0, 
      expectedBreaches: 1.0 
    }
  };

  // Helper function to determine breach status color
  const getBreachStatusColor = (actual: number, expected: number) => {
    const ratio = actual / expected;
    if (ratio <= 0.8) return "text-dashboard-positive"; // Fewer breaches than expected (good)
    if (ratio <= 1.2) return "text-yellow-500"; // Close to expected (neutral)
    return "text-dashboard-negative"; // More breaches than expected (bad)
  };
  
  return (
    <CardGradient>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="text-dashboard-accent h-5 w-5" />
          <h3 className="text-lg font-medium">Value at Risk (VaR) Metrics & Backtesting</h3>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-1 rounded-full hover:bg-slate-700/30">
                <Info className="h-5 w-5 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <div className="space-y-2">
                <p className="text-sm">Value at Risk (VaR) estimates the maximum potential loss over a specific time horizon at a given confidence level.</p>
                <p className="text-sm"><span className="font-medium">Breach:</span> When actual loss exceeds VaR prediction. With 95% confidence, we expect breaches 5% of the time.</p>
                <p className="text-sm"><span className="font-medium">Backtesting:</span> Comparing actual breaches to expected breaches validates model accuracy. Significantly more breaches than expected indicates poor risk estimation.</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {/* 95% Confidence VaR */}
        <div className="col-span-2">
          <div className="bg-slate-800/50 rounded-lg p-4 h-full">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">95% Confidence VaR</h4>
            
            <div className="space-y-4">
              {/* Parametric VaR */}
              <div className="border-b border-slate-700 pb-3">
                <div className="flex justify-between items-start mb-1">
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <p className="text-sm cursor-help underline decoration-dotted underline-offset-4">Parametric VaR</p>
                    </HoverCardTrigger>
                    <HoverCardContent className="bg-slate-900 border-slate-800 text-xs">
                      <p>Parametric VaR uses a normal distribution assumption to calculate risk.</p>
                    </HoverCardContent>
                  </HoverCard>
                  <p className="text-lg font-semibold text-dashboard-negative">-{metrics.parametricVaR95.toFixed(2)}%</p>
                </div>
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Breaches: {breachStats.parametricVaR95.breachCount}</span>
                  <span className={getBreachStatusColor(breachStats.parametricVaR95.breachCount, breachStats.parametricVaR95.expectedBreaches)}>
                    {breachStats.parametricVaR95.breachPercentage}% (Expected: 5%)
                  </span>
                </div>
              </div>
              
              {/* Monte Carlo VaR */}
              <div className="border-b border-slate-700 pb-3">
                <div className="flex justify-between items-start mb-1">
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <p className="text-sm cursor-help underline decoration-dotted underline-offset-4">Monte Carlo VaR</p>
                    </HoverCardTrigger>
                    <HoverCardContent className="bg-slate-900 border-slate-800 text-xs">
                      <p>Monte Carlo VaR uses simulations to estimate potential losses.</p>
                    </HoverCardContent>
                  </HoverCard>
                  <p className="text-lg font-semibold text-dashboard-negative">-{metrics.monteCarloVaR95.toFixed(2)}%</p>
                </div>
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Breaches: {breachStats.monteCarloVaR95.breachCount}</span>
                  <span className={getBreachStatusColor(breachStats.monteCarloVaR95.breachCount, breachStats.monteCarloVaR95.expectedBreaches)}>
                    {breachStats.monteCarloVaR95.breachPercentage}% (Expected: 5%)
                  </span>
                </div>
              </div>
              
              {/* DeepVaR */}
              <div>
                <div className="flex justify-between items-start mb-1">
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <p className="text-sm cursor-help underline decoration-dotted underline-offset-4">DeepVaR</p>
                    </HoverCardTrigger>
                    <HoverCardContent className="bg-slate-900 border-slate-800 text-xs">
                      <p>DeepVaR uses neural networks to predict market risk.</p>
                    </HoverCardContent>
                  </HoverCard>
                  <p className="text-lg font-semibold text-dashboard-negative">-{metrics.deepVaR95.toFixed(2)}%</p>
                </div>
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Breaches: {breachStats.deepVaR95.breachCount}</span>
                  <span className={getBreachStatusColor(breachStats.deepVaR95.breachCount, breachStats.deepVaR95.expectedBreaches)}>
                    {breachStats.deepVaR95.breachPercentage}% (Expected: 5%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 99% Confidence VaR */}
        <div className="col-span-2">
          <div className="bg-slate-800/50 rounded-lg p-4 h-full">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">99% Confidence VaR</h4>
            
            <div className="space-y-4">
              {/* Parametric VaR */}
              <div className="border-b border-slate-700 pb-3">
                <div className="flex justify-between items-start mb-1">
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <p className="text-sm cursor-help underline decoration-dotted underline-offset-4">Parametric VaR</p>
                    </HoverCardTrigger>
                    <HoverCardContent className="bg-slate-900 border-slate-800 text-xs">
                      <p>Parametric VaR uses a normal distribution assumption to calculate risk.</p>
                    </HoverCardContent>
                  </HoverCard>
                  <p className="text-lg font-semibold text-dashboard-negative">-{metrics.parametricVaR99.toFixed(2)}%</p>
                </div>
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Breaches: {breachStats.parametricVaR99.breachCount}</span>
                  <span className={getBreachStatusColor(breachStats.parametricVaR99.breachCount, breachStats.parametricVaR99.expectedBreaches)}>
                    {breachStats.parametricVaR99.breachPercentage}% (Expected: 1%)
                  </span>
                </div>
              </div>
              
              {/* Monte Carlo VaR */}
              <div className="border-b border-slate-700 pb-3">
                <div className="flex justify-between items-start mb-1">
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <p className="text-sm cursor-help underline decoration-dotted underline-offset-4">Monte Carlo VaR</p>
                    </HoverCardTrigger>
                    <HoverCardContent className="bg-slate-900 border-slate-800 text-xs">
                      <p>Monte Carlo VaR uses simulations to estimate potential losses.</p>
                    </HoverCardContent>
                  </HoverCard>
                  <p className="text-lg font-semibold text-dashboard-negative">-{metrics.monteCarloVaR99.toFixed(2)}%</p>
                </div>
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Breaches: {breachStats.monteCarloVaR99.breachCount}</span>
                  <span className={getBreachStatusColor(breachStats.monteCarloVaR99.breachCount, breachStats.monteCarloVaR99.expectedBreaches)}>
                    {breachStats.monteCarloVaR99.breachPercentage}% (Expected: 1%)
                  </span>
                </div>
              </div>
              
              {/* DeepVaR */}
              <div>
                <div className="flex justify-between items-start mb-1">
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <p className="text-sm cursor-help underline decoration-dotted underline-offset-4">DeepVaR</p>
                    </HoverCardTrigger>
                    <HoverCardContent className="bg-slate-900 border-slate-800 text-xs">
                      <p>DeepVaR uses neural networks to predict market risk.</p>
                    </HoverCardContent>
                  </HoverCard>
                  <p className="text-lg font-semibold text-dashboard-negative">-{metrics.deepVaR99.toFixed(2)}%</p>
                </div>
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Breaches: {breachStats.deepVaR99.breachCount}</span>
                  <span className={getBreachStatusColor(breachStats.deepVaR99.breachCount, breachStats.deepVaR99.expectedBreaches)}>
                    {breachStats.deepVaR99.breachPercentage}% (Expected: 1%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Charts preview column - kept the same width but replaced content */}
        <div className="col-span-2">
          <div className="bg-slate-800/50 rounded-lg p-4 h-full flex flex-col gap-2">
            {/* Add any additional content you want in this space */}
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Breach Statistics</h4>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-1">
                <p className="text-xs text-muted-foreground">95% Confidence</p>
                <div className="h-2 w-full bg-slate-700 rounded-full mt-1 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-dashboard-accent to-dashboard-negative" 
                    style={{ width: `${(breachStats.parametricVaR95.breachPercentage/5)*100}%` }} 
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {breachStats.parametricVaR95.breachPercentage}% vs 5% expected
                </p>
              </div>
              
              <div className="col-span-1">
                <p className="text-xs text-muted-foreground">99% Confidence</p>
                <div className="h-2 w-full bg-slate-700 rounded-full mt-1 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-dashboard-accent to-dashboard-negative" 
                    style={{ width: `${(breachStats.parametricVaR99.breachPercentage/1)*100}%` }} 
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {breachStats.parametricVaR99.breachPercentage}% vs 1% expected
                </p>
              </div>
            </div>
            
            <div className="mt-auto text-xs text-muted-foreground border-t border-slate-700 pt-2">
              <p>Breaches should align with confidence level</p>
              <p className="mt-1">
                <span className="inline-block w-2 h-2 rounded-full bg-dashboard-positive mr-1"></span>
                Good: Fewer than expected
              </p>
              <p className="mt-1">
                <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-1"></span>
                Average: Close to expected
              </p>
              <p className="mt-1">
                <span className="inline-block w-2 h-2 rounded-full bg-dashboard-negative mr-1"></span>
                Poor: More than expected
              </p>
            </div>
          </div>
        </div>
      </div>
    </CardGradient>
  );
}
