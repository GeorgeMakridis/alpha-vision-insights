
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
    
    // Calculate weighted VaR metrics only for DeepVaR 95 and DeepVaR 99 (approximate with parametricVaR95 and parametricVaR99)
    const varData = calculateWeightedVaRMetrics(selectedAssets, weights);
    
    // Calculate the VaR levels based on the portfolio's minimum price
    const priceMin = Math.min(...filteredData.map((d: any) => d.price)) * 0.9;
    const priceMax = Math.max(...filteredData.map((d: any) => d.price)) * 1.05;
    
    // Enhance the data with only Deep VaR lines
    const enhancedData = filteredData.map((day: any) => {
      return {
        ...day,
        // DeepVaR95 and DeepVaR99 lines approximated here:
        deepVaR95: day.price * (1 - varData.deepVaR95),
        deepVaR99: day.price * (1 - varData.deepVaR99),

        // Percentage for tooltip if needed
        deepVaR95Pct: varData.deepVaR95 * 100,
        deepVaR99Pct: varData.deepVaR99 * 100,
      };
    });
    
    setChartData(enhancedData);
  }, [selectedAssets, weights, days]);

  // Calculate weighted average VaR metrics only for deepVaR95 and deepVaR99 using approximations (use parametricVaR95 and parametricVaR99 as proxies)
  const calculateWeightedVaRMetrics = (
    selectedAssets: string[], 
    weights: Record<string, number>
  ) => {
    let deepVaR95 = 0;
    let deepVaR99 = 0;
    
    selectedAssets.forEach(ticker => {
      const stock = mockStocks.find(s => s.ticker === ticker);
      if (stock && weights[ticker]) {
        deepVaR95 += (stock.metrics.parametricVaR95 / 100) * weights[ticker];
        deepVaR99 += (stock.metrics.parametricVaR99 / 100) * weights[ticker];
      }
    });
    
    return {
      deepVaR95,
      deepVaR99,
    };
  };

  const calculatePortfolioPriceHistory = (
    selectedAssets: string[], 
    weights: Record<string, number>
  ) => {
    const firstStock = mockStocks.find(s => s.ticker === selectedAssets[0]);
    if (!firstStock) return [];
    
    const portfolioHistory = [...firstStock.priceHistory].map(day => ({
      date: day.date,
      price: 0,
      volume: 0,
      sentiment: 0
    }));
    
    selectedAssets.forEach(ticker => {
      const stock = mockStocks.find(s => s.ticker === ticker);
      if (stock && weights[ticker]) {
        stock.priceHistory.forEach((day, i) => {
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

  const tooltipFormatter = (value: any, name: string) => {
    if (name === "price") {
      return [`$${value.toFixed(2)}`, "Portfolio Value"];
    } else if (name === "volume") {
      return [value.toFixed(0), "Trading Volume"];
    } else if (name === "sentiment") {
      const sentiment = value >= 0.5 ? "Bullish" : value >= 0 ? "Slightly Bullish" : 
                        value >= -0.5 ? "Slightly Bearish" : "Bearish";
      return [`${value.toFixed(2)} (${sentiment})`, "Market Sentiment"];
    } else if (name === "deepVaR95") {
      return [`$${value.toFixed(2)}`, "Deep VaR (95%)"];
    } else if (name === "deepVaR99") {
      return [`$${value.toFixed(2)}`, "Deep VaR (99%)"];
    } else if (name === "deepVaR95Pct") {
      return [`${value.toFixed(2)}%`, "Deep VaR (95%)"];
    } else if (name === "deepVaR99Pct") {
      return [`${value.toFixed(2)}%`, "Deep VaR (99%)"];
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
              <p className="text-xs mb-2">This chart displays the portfolio price with VaR metrics representing potential loss at 95% and 99% confidence levels.</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><span className="text-[#8B5CF6] font-medium">Portfolio Price</span>: Current value</li>
                <li><span className="text-[#eab308] font-medium">Deep VaR 95%</span>: Estimated loss at 95% confidence</li>
                <li><span className="text-[#06b6d4] font-medium">Deep VaR 99%</span>: Estimated loss at 99% confidence</li>
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
              type="natural" 
              dataKey="price" 
              name="Portfolio Value" 
              stroke="#8B5CF6" 
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 6, stroke: '#8B5CF6', strokeWidth: 1, fill: '#8B5CF6' }}
            />
            
            {/* Deep VaR 95 Line */}
            <Line 
              yAxisId="price" 
              type="natural" 
              dataKey="deepVaR95" 
              name="Deep VaR 95%" 
              stroke="#eab308" 
              strokeWidth={2}
              strokeDasharray="3 3"
              dot={false}
            />
            
            {/* Deep VaR 99 Line */}
            <Line 
              yAxisId="price" 
              type="natural" 
              dataKey="deepVaR99" 
              name="Deep VaR 99%" 
              stroke="#06b6d4" 
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
            
            {/* Area under the price line for visual emphasis */}
            <Area
              yAxisId="price"
              type="natural"
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
