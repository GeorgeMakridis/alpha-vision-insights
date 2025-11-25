
import { CardGradient } from "@/components/ui/card-gradient";
import { useQuery } from "@tanstack/react-query";
import { apiService, MetricsResponse } from "@/services/api";
import { Sparkles, Info } from "lucide-react";
import { useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface VaRMetricsCardProps {
  ticker: string;
  days?: number; // Period for backtesting (matches chart period)
}

export default function VaRMetricsCard({ ticker, days }: VaRMetricsCardProps) {
  // Fixed rolling window: 252 days (1 trading year)
  const ROLLING_WINDOW = 252;
  
  // Fetch metrics data from API with period and fixed rolling window
  const { data: metricsData, isLoading, error } = useQuery({
    queryKey: ['stock-metrics', ticker, days, ROLLING_WINDOW],
    queryFn: () => apiService.getStockMetrics(ticker, days, ROLLING_WINDOW),
    enabled: !!ticker,
  });
  
  if (isLoading) {
    return (
      <CardGradient className="h-[240px] flex items-center justify-center">
        <p className="text-muted-foreground">Loading VaR metrics...</p>
      </CardGradient>
    );
  }
  
  if (error) {
    return (
      <CardGradient className="h-[240px] flex flex-col items-center justify-center">
        <p className="text-dashboard-negative text-center">
          Error loading VaR metrics: {error.message || 'Unknown error'}
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
  const backtesting = (metricsData as MetricsResponse).backtesting || {};
  
  // Helper function to determine breach status color
  const getBreachStatusColor = (actual: number, expected: number) => {
    const ratio = actual / expected;
    if (ratio <= 0.8) return "text-dashboard-positive"; // Fewer breaches than expected (good)
    if (ratio <= 1.2) return "text-yellow-500"; // Close to expected (neutral)
    return "text-dashboard-negative"; // More breaches than expected (bad)
  };
  
  // Helper to get performance rating
  const getPerformanceRating = (actual: number, expected: number) => {
    const ratio = actual / expected;
    if (ratio <= 0.7) return { label: "Excellent", color: "text-dashboard-positive", bg: "bg-dashboard-positive/10" };
    if (ratio <= 0.9) return { label: "Good", color: "text-dashboard-positive", bg: "bg-dashboard-positive/10" };
    if (ratio <= 1.1) return { label: "Acceptable", color: "text-yellow-500", bg: "bg-yellow-500/10" };
    if (ratio <= 1.5) return { label: "Poor", color: "text-orange-500", bg: "bg-orange-500/10" };
    return { label: "Very Poor", color: "text-dashboard-negative", bg: "bg-dashboard-negative/10" };
  };

  // Filter out methods with 0.0 values (unavailable)
  // VaR values are negative, so we check for < 0 (valid) or == 0 (unavailable)
  const availableMethods = [
    { key: 'parametricVaR95', name: 'Parametric', var: metrics.parametricVaR95, backtest: backtesting.parametricVaR95 },
    { key: 'monteCarloVaR95', name: 'Monte Carlo', var: metrics.monteCarloVaR95, backtest: backtesting.monteCarloVaR95 },
    { key: 'parametricVaR99', name: 'Parametric', var: metrics.parametricVaR99, backtest: backtesting.parametricVaR99 },
    { key: 'monteCarloVaR99', name: 'Monte Carlo', var: metrics.monteCarloVaR99, backtest: backtesting.monteCarloVaR99 },
  ].filter(m => m.var < 0); // VaR is negative (loss), so filter for < 0

  // Get period label
  const periodLabel = days ? `Last ${days} days` : 'All available data';
  
  return (
    <CardGradient>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="text-dashboard-accent h-5 w-5" />
          <h3 className="text-lg font-medium">Value at Risk (VaR) Metrics</h3>
          <span className="text-xs text-muted-foreground">({periodLabel})</span>
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
                <p className="text-sm">VaR estimates maximum potential loss at a given confidence level.</p>
                <p className="text-sm">Backtesting counts how many times actual losses exceeded the VaR threshold during the selected period.</p>
                <p className="text-sm">Rolling window: {ROLLING_WINDOW} days (1 trading year) used to calculate VaR for each day.</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 95% Confidence VaR */}
        <div className="bg-slate-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-muted-foreground">95% Confidence Level</h4>
            <span className="text-xs text-muted-foreground">{periodLabel}</span>
          </div>
          
          <div className="space-y-3">
            {/* Parametric VaR */}
            {metrics.parametricVaR95 !== 0 && (
              <div className="border border-slate-700 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm font-medium">Parametric VaR</p>
                    <p className="text-xs text-muted-foreground">Normal distribution assumption</p>
                  </div>
                  <p className="text-xl font-bold text-dashboard-negative">
                    {metrics.parametricVaR95 < 0 ? '' : '-'}{Math.abs(metrics.parametricVaR95).toFixed(2)}%
                  </p>
                </div>
                {backtesting.parametricVaR95 && (
                  <div className="mt-2 pt-2 border-t border-slate-700">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Breaches:</span>
                      <span className="font-semibold text-dashboard-negative">
                        {backtesting.parametricVaR95.breachCount} out of {backtesting.parametricVaR95.totalDays} days
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${getPerformanceRating(backtesting.parametricVaR95.breachCount, backtesting.parametricVaR95.expectedBreaches).bg}`}
                          style={{ width: `${Math.min(100, (backtesting.parametricVaR95.breachCount / backtesting.parametricVaR95.totalDays) * 100)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${getPerformanceRating(backtesting.parametricVaR95.breachCount, backtesting.parametricVaR95.expectedBreaches).color}`}>
                        {getPerformanceRating(backtesting.parametricVaR95.breachCount, backtesting.parametricVaR95.expectedBreaches).label}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Monte Carlo VaR */}
            {metrics.monteCarloVaR95 !== 0 && (
              <div className="border border-slate-700 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm font-medium">Monte Carlo VaR</p>
                    <p className="text-xs text-muted-foreground">Simulation-based estimation</p>
                  </div>
                  <p className="text-xl font-bold text-dashboard-negative">
                    {metrics.monteCarloVaR95 < 0 ? '' : '-'}{Math.abs(metrics.monteCarloVaR95).toFixed(2)}%
                  </p>
                </div>
                {backtesting.monteCarloVaR95 && (
                  <div className="mt-2 pt-2 border-t border-slate-700">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Breaches:</span>
                      <span className="font-semibold text-dashboard-negative">
                        {backtesting.monteCarloVaR95.breachCount} out of {backtesting.monteCarloVaR95.totalDays} days
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${getPerformanceRating(backtesting.monteCarloVaR95.breachCount, backtesting.monteCarloVaR95.expectedBreaches).bg}`}
                          style={{ width: `${Math.min(100, (backtesting.monteCarloVaR95.breachCount / backtesting.monteCarloVaR95.totalDays) * 100)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${getPerformanceRating(backtesting.monteCarloVaR95.breachCount, backtesting.monteCarloVaR95.expectedBreaches).color}`}>
                        {getPerformanceRating(backtesting.monteCarloVaR95.breachCount, backtesting.monteCarloVaR95.expectedBreaches).label}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* 99% Confidence VaR */}
        <div className="bg-slate-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-muted-foreground">99% Confidence Level</h4>
            <span className="text-xs text-muted-foreground">{periodLabel}</span>
          </div>
          
          <div className="space-y-3">
            {/* Parametric VaR */}
            {metrics.parametricVaR99 < 0 && (
              <div className="border border-slate-700 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm font-medium">Parametric VaR</p>
                    <p className="text-xs text-muted-foreground">Normal distribution assumption</p>
                  </div>
                  <p className="text-xl font-bold text-dashboard-negative">
                    {metrics.parametricVaR99 < 0 ? '' : '-'}{Math.abs(metrics.parametricVaR99).toFixed(2)}%
                  </p>
                </div>
                {backtesting.parametricVaR99 && (
                  <div className="mt-2 pt-2 border-t border-slate-700">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Breaches:</span>
                      <span className="font-semibold text-dashboard-negative">
                        {backtesting.parametricVaR99.breachCount} out of {backtesting.parametricVaR99.totalDays} days
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${getPerformanceRating(backtesting.parametricVaR99.breachCount, backtesting.parametricVaR99.expectedBreaches).bg}`}
                          style={{ width: `${Math.min(100, (backtesting.parametricVaR99.breachCount / backtesting.parametricVaR99.totalDays) * 100)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${getPerformanceRating(backtesting.parametricVaR99.breachCount, backtesting.parametricVaR99.expectedBreaches).color}`}>
                        {getPerformanceRating(backtesting.parametricVaR99.breachCount, backtesting.parametricVaR99.expectedBreaches).label}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Monte Carlo VaR */}
            {metrics.monteCarloVaR99 < 0 && (
              <div className="border border-slate-700 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm font-medium">Monte Carlo VaR</p>
                    <p className="text-xs text-muted-foreground">Simulation-based estimation</p>
                  </div>
                  <p className="text-xl font-bold text-dashboard-negative">
                    {metrics.monteCarloVaR99 < 0 ? '' : '-'}{Math.abs(metrics.monteCarloVaR99).toFixed(2)}%
                  </p>
                </div>
                {backtesting.monteCarloVaR99 && (
                  <div className="mt-2 pt-2 border-t border-slate-700">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Breaches:</span>
                      <span className="font-semibold text-dashboard-negative">
                        {backtesting.monteCarloVaR99.breachCount} out of {backtesting.monteCarloVaR99.totalDays} days
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${getPerformanceRating(backtesting.monteCarloVaR99.breachCount, backtesting.monteCarloVaR99.expectedBreaches).bg}`}
                          style={{ width: `${Math.min(100, (backtesting.monteCarloVaR99.breachCount / backtesting.monteCarloVaR99.totalDays) * 100)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${getPerformanceRating(backtesting.monteCarloVaR99.breachCount, backtesting.monteCarloVaR99.expectedBreaches).color}`}>
                        {getPerformanceRating(backtesting.monteCarloVaR99.breachCount, backtesting.monteCarloVaR99.expectedBreaches).label}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </CardGradient>
  );
}
