
import { CardGradient } from "@/components/ui/card-gradient";
import { mockStocks } from "@/data/mockData";
import { Sparkles } from "lucide-react";

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
  
  return (
    <CardGradient>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="text-dashboard-accent h-5 w-5" />
        <h3 className="text-lg font-medium">Value at Risk (VaR) Metrics</h3>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        {/* 95% Confidence VaR */}
        <div className="col-span-3 md:col-span-1">
          <div className="bg-slate-800/50 rounded-lg p-4 h-full">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">95% Confidence Level</h4>
            
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Parametric VaR</p>
                <p className="text-lg font-semibold text-dashboard-negative">-{metrics.parametricVaR95.toFixed(2)}%</p>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground mb-1">Monte Carlo VaR</p>
                <p className="text-lg font-semibold text-dashboard-negative">-{metrics.monteCarloVaR95.toFixed(2)}%</p>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground mb-1">DeepVaR</p>
                <p className="text-lg font-semibold text-dashboard-negative">-{metrics.deepVaR95.toFixed(2)}%</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* 99% Confidence VaR */}
        <div className="col-span-3 md:col-span-1">
          <div className="bg-slate-800/50 rounded-lg p-4 h-full">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">99% Confidence Level</h4>
            
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Parametric VaR</p>
                <p className="text-lg font-semibold text-dashboard-negative">-{metrics.parametricVaR99.toFixed(2)}%</p>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground mb-1">Monte Carlo VaR</p>
                <p className="text-lg font-semibold text-dashboard-negative">-{metrics.monteCarloVaR99.toFixed(2)}%</p>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground mb-1">DeepVaR</p>
                <p className="text-lg font-semibold text-dashboard-negative">-{metrics.deepVaR99.toFixed(2)}%</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* VaR Explanation */}
        <div className="col-span-3 md:col-span-1">
          <div className="bg-slate-800/50 rounded-lg p-4 h-full">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">VaR Interpretation</h4>
            
            <p className="text-xs text-muted-foreground">
              Value at Risk (VaR) estimates the maximum potential loss over a specific time horizon at a given confidence level. 
              <br /><br />
              For example, a 95% VaR of {metrics.parametricVaR95.toFixed(2)}% means there is a 95% probability that the loss will not exceed {metrics.parametricVaR95.toFixed(2)}% over the next trading day.
              <br /><br />
              Different calculation methods (Parametric, Monte Carlo, DeepVaR) use varying statistical approaches to estimate risk.
            </p>
          </div>
        </div>
      </div>
    </CardGradient>
  );
}
