
import { CardGradient } from "@/components/ui/card-gradient";
import { mockStocks } from "@/data/mockData";
import { AlertTriangle, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { 
  Area, 
  CartesianGrid, 
  ComposedChart, 
  Legend, 
  Line, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis,
  ReferenceLine
} from "recharts";
import { 
  Tooltip as UITooltip, 
  TooltipProvider, 
  TooltipTrigger, 
  TooltipContent 
} from "./ui/tooltip";

interface PortfolioVaRChartProps {
  selectedAssets: string[];
  weights: Record<string, number>;
  days?: number;
}

export default function PortfolioVaRChart({ 
  selectedAssets, 
  weights, 
  days = 30 
}: PortfolioVaRChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (selectedAssets.length === 0) {
      setChartData([]);
      return;
    }
    
    // Calculate portfolio price history
    const portfolioData = calculatePortfolioPriceHistory(selectedAssets, weights);
    const filteredData = portfolioData.slice(-days);
    
    // Calculate weighted VaR metrics
    const varData = calculateWeightedVaRMetrics(selectedAssets, weights);
    
    // Calculate the VaR levels based on the portfolio's minimum price
    const priceMin = Math.min(...filteredData.map((d: any) => d.price)) * 0.9;
    const priceMax = Math.max(...filteredData.map((d: any) => d.price)) * 1.05;
    
    // Enhance the data with VaR lines
    const enhancedData = filteredData.map((day: any) => {
      return {
        ...day,
        // Historic VaR - 95% confidence
        historicVaR95: day.price * (1 - varData.historicVaR95),
        // Parametric VaR - 95% confidence 
        parametricVaR95: day.price * (1 - varData.parametricVaR95),
        // Monte Carlo VaR - 95% confidence
        monteCarloVaR95: day.price * (1 - varData.monteCarloVaR95),
        // Add VaR values as percentages for the tooltip
        historicVaR95Pct: varData.historicVaR95 * 100,
        parametricVaR95Pct: varData.parametricVaR95 * 100,
        monteCarloVaR95Pct: varData.monteCarloVaR95 * 100,
      };
    });
    
    setChartData(enhancedData);
  }, [selectedAssets, weights, days]);

  // Calculate weighted average VaR metrics from individual assets
  const calculateWeightedVaRMetrics = (
    selectedAssets: string[], 
    weights: Record<string, number>
  ) => {
    let historicVaR95 = 0;
    let parametricVaR95 = 0;
    let monteCarloVaR95 = 0;
    
    selectedAssets.forEach(ticker => {
      const stock = mockStocks.find(s => s.ticker === ticker);
      if (stock && weights[ticker]) {
        // Weight the VaR metrics by the asset's portfolio weight
        // Use 'metrics' instead of 'riskMetrics'
        parametricVaR95 += stock.metrics.parametricVaR95 / 100 * weights[ticker];
        monteCarloVaR95 += stock.metrics.monteCarloVaR95 / 100 * weights[ticker];
        
        // For historicVaR95, we'll use parametricVaR95 value since it's not in the data
        // This is just an approximation
        historicVaR95 += stock.metrics.parametricVaR95 / 100 * weights[ticker];
      }
    });
    
    return {
      historicVaR95,
      parametricVaR95,
      monteCarloVaR95
    };
  };

  // Helper function to calculate portfolio price history (similar to the one in mockData)
  const calculatePortfolioPriceHistory = (
    selectedAssets: string[], 
    weights: Record<string, number>
  ) => {
    // Initialize with the first asset's price history structure
    const firstStock = mockStocks.find(s => s.ticker === selectedAssets[0]);
    if (!firstStock) return [];
    
    const portfolioHistory = [...firstStock.priceHistory].map(day => ({
      date: day.date,
      price: 0,
      volume: 0,
      sentiment: 0
    }));
    
    // Calculate weighted average for each day
    selectedAssets.forEach(ticker => {
      const stock = mockStocks.find(s => s.ticker === ticker);
      if (stock && weights[ticker]) {
        stock.priceHistory.forEach((day, i) => {
          // Ensure we're only processing days that exist in portfolioHistory
          if (i < portfolioHistory.length) {
            portfolioHistory[i].price += day.price * weights[ticker];
            portfolioHistory[i].volume += day.volume * weights[ticker];
            portfolioHistory[i].sentiment += day.sentiment * weights[ticker];
          }
        });
      }
    });
    
    return portfolioHistory;
  };

  if (selectedAssets.length === 0) {
    return (
      <CardGradient className="h-[500px] flex flex-col items-center justify-center">
        <AlertTriangle className="h-8 w-8 text-yellow-500 mb-2" />
        <p className="text-muted-foreground">Please select at least one asset</p>
      </CardGradient>
    );
  }

  if (chartData.length === 0) {
    return (
      <CardGradient className="h-[500px] flex items-center justify-center">
        <p className="text-muted-foreground">Loading portfolio data...</p>
      </CardGradient>
    );
  }

  // Formatter for tooltip values
  const tooltipFormatter = (value: any, name: string) => {
    if (name === "price") {
      return [`$${value.toFixed(2)}`, "Portfolio Value"];
    } else if (name === "volume") {
      return [value.toFixed(0), "Trading Volume"];
    } else if (name === "sentiment") {
      const sentiment = value >= 0.5 ? "Bullish" : value >= 0 ? "Slightly Bullish" : 
                        value >= -0.5 ? "Slightly Bearish" : "Bearish";
      return [`${value.toFixed(2)} (${sentiment})`, "Market Sentiment"];
    } else if (name === "historicVaR95") {
      return [`$${value.toFixed(2)}`, "Historical VaR (95%)"];
    } else if (name === "parametricVaR95") {
      return [`$${value.toFixed(2)}`, "Parametric VaR (95%)"];
    } else if (name === "monteCarloVaR95") {
      return [`$${value.toFixed(2)}`, "Monte Carlo VaR (95%)"];
    } else if (name === "historicVaR95Pct") {
      return [`${value.toFixed(2)}%`, "Historical VaR (95%)"];
    } else if (name === "parametricVaR95Pct") {
      return [`${value.toFixed(2)}%`, "Parametric VaR (95%)"];
    } else if (name === "monteCarloVaR95Pct") {
      return [`${value.toFixed(2)}%`, "Monte Carlo VaR (95%)"];
    }
    return [value, name];
  };

  return (
    <CardGradient className="h-[500px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Price & VaR Analysis</h3>
        <TooltipProvider>
          <UITooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-medium mb-1">Value at Risk (VaR) Analysis</p>
              <p className="text-xs mb-2">This chart displays the portfolio price with VaR metrics representing potential loss at 95% confidence level.</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><span className="text-[#8B5CF6] font-medium">Portfolio Price</span>: Current value</li>
                <li><span className="text-[#F43F5E] font-medium">Historical VaR</span>: Based on past returns</li>
                <li><span className="text-[#EC4899] font-medium">Parametric VaR</span>: Using normal distribution</li>
                <li><span className="text-[#D946EF] font-medium">Monte Carlo VaR</span>: Simulated outcomes</li>
              </ul>
            </TooltipContent>
          </UITooltip>
        </TooltipProvider>
      </div>
      <div className="h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart 
            data={chartData} 
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
            <XAxis 
              dataKey="date" 
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }} 
              tickLine={{ stroke: '#4B5563' }}
            />
            <YAxis 
              yAxisId="price"
              orientation="right"
              domain={['auto', 'auto']}
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }}
              tickLine={{ stroke: '#4B5563' }}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
              label={{ 
                value: 'Portfolio Value', 
                angle: 90, 
                position: 'insideRight', 
                fill: '#8B5CF6',
                style: { textAnchor: 'middle' }
              }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1F2937', 
                borderColor: '#4B5563',
                borderRadius: '0.375rem',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }}
              labelStyle={{ color: '#E5E7EB', fontWeight: 'bold', borderBottom: '1px solid #4B5563', marginBottom: '0.5rem', paddingBottom: '0.5rem' }}
              formatter={tooltipFormatter}
              labelFormatter={(value) => `Date: ${value}`}
            />
            <Legend 
              verticalAlign="top"
              height={36}
              wrapperStyle={{ paddingTop: '10px' }}
            />
            
            {/* Portfolio price line */}
            <Line 
              yAxisId="price" 
              type="monotone" 
              dataKey="price" 
              name="Portfolio Value" 
              stroke="#8B5CF6" 
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 6, stroke: '#8B5CF6', strokeWidth: 1, fill: '#8B5CF6' }}
            />
            
            {/* Historical VaR Line */}
            <Line 
              yAxisId="price" 
              type="monotone" 
              dataKey="historicVaR95" 
              name="Historical VaR (95%)" 
              stroke="#F43F5E" 
              strokeWidth={2}
              strokeDasharray="3 3"
              dot={false}
            />
            
            {/* Parametric VaR Line */}
            <Line 
              yAxisId="price" 
              type="monotone" 
              dataKey="parametricVaR95" 
              name="Parametric VaR (95%)" 
              stroke="#EC4899" 
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
            
            {/* Monte Carlo VaR Line */}
            <Line 
              yAxisId="price" 
              type="monotone" 
              dataKey="monteCarloVaR95" 
              name="Monte Carlo VaR (95%)" 
              stroke="#D946EF" 
              strokeWidth={2}
              strokeDasharray="7 7"
              dot={false}
            />
            
            {/* Area under the price line for visual emphasis */}
            <Area
              yAxisId="price"
              type="monotone"
              dataKey="price"
              fill="#8B5CF6"
              stroke="none"
              opacity={0.1}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </CardGradient>
  );
}
