import { CardGradient } from "@/components/ui/card-gradient";
import { calculatePortfolioPriceHistory } from "@/data/mockData";
import { AlertTriangle, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { 
  Area, 
  Bar, 
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

interface PortfolioChartProps {
  selectedAssets: string[];
  weights: Record<string, number>;
  days?: number;
}

export default function PortfolioChart({ 
  selectedAssets, 
  weights, 
  days = 30 
}: PortfolioChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (selectedAssets.length === 0) {
      setChartData([]);
      return;
    }
    
    // Calculate the portfolio price history
    const data = calculatePortfolioPriceHistory(selectedAssets, weights);
    
    // Filter for the specified number of days
    const filteredData = data.slice(-days);
    
    // Find min price for VaR lines calculation
    const priceMin = Math.min(...filteredData.map((d: any) => d.price)) * 0.95;
    
    // Add VaR breach markers and VaR lines - simulate breaches for visualization
    const enhancedData = filteredData.map((day: any) => {
      return {
        ...day,
        // Breach markers
        parametricVaR95Breach: Math.random() > 0.95 ? -1 : null,
        monteCarloVaR95Breach: Math.random() > 0.95 ? -1 : null,
        deepVaR95Breach: Math.random() > 0.96 ? -1 : null,
        parametricVaR99Breach: Math.random() > 0.99 ? -1 : null, 
        monteCarloVaR99Breach: Math.random() > 0.99 ? -1 : null,
        deepVaR99Breach: Math.random() > 0.99 ? -1 : null,
        // VaR threshold lines
        parametricVaR95Line: priceMin * 1.05,
        monteCarloVaR95Line: priceMin * 1.04,
        deepVaR95Line: priceMin * 1.03,
        parametricVaR99Line: priceMin * 1.02,
        monteCarloVaR99Line: priceMin * 1.01,
        deepVaR99Line: priceMin * 1.00
      };
    });
    
    setChartData(enhancedData);
  }, [selectedAssets, weights, days]);

  if (selectedAssets.length === 0) {
    return (
      <CardGradient className="h-[400px] flex flex-col items-center justify-center">
        <AlertTriangle className="h-8 w-8 text-yellow-500 mb-2" />
        <p className="text-muted-foreground">Please select at least one asset</p>
      </CardGradient>
    );
  }

  if (chartData.length === 0) {
    return (
      <CardGradient className="h-[400px] flex items-center justify-center">
        <p className="text-muted-foreground">Loading portfolio data...</p>
      </CardGradient>
    );
  }

  // Find min and max for price to set the y-axis domain
  const priceMin = Math.min(...chartData.map((d: any) => d.price)) * 0.95;
  const priceMax = Math.max(...chartData.map((d: any) => d.price)) * 1.05;

  return (
    <CardGradient className="h-[500px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Portfolio Performance & Sentiment</h3>
        <TooltipProvider>
          <UITooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>This chart shows portfolio value and sentiment scores (-1 to 1). Higher sentiment indicates positive market perception.</p>
            </TooltipContent>
          </UITooltip>
        </TooltipProvider>
      </div>
      <div className="h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="date" 
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }} 
              tickLine={{ stroke: '#4B5563' }}
            />
            <YAxis 
              yAxisId="left"
              domain={[priceMin, priceMax]}
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }}
              tickLine={{ stroke: '#4B5563' }}
              label={{ value: 'Price', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              domain={[-1, 1]}
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }}
              tickLine={{ stroke: '#4B5563' }}
              label={{ value: 'Sentiment', angle: 90, position: 'insideRight', fill: '#9CA3AF' }}
            />
            <YAxis 
              yAxisId="volume" 
              orientation="right" 
              domain={[0, 'auto']}
              hide
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1A1F2C', borderColor: '#4B5563' }}
              labelStyle={{ color: '#E5E7EB' }}
              formatter={(value: any, name: string) => {
                if (typeof value === 'number') {
                  return [value.toFixed(2), name];
                }
                return [value, name];
              }}
            />
            <Legend />
            <Line 
              yAxisId="left" 
              type="monotone" 
              dataKey="price" 
              name="Portfolio Value" 
              stroke="#8B5CF6" 
              strokeWidth={2}
              dot={false}
            />
            <Line 
              yAxisId="right" 
              type="monotone" 
              dataKey="sentiment" 
              name="Portfolio Sentiment" 
              stroke="#22D3EE" 
              strokeWidth={2}
              dot={false}
            />
            <Bar 
              yAxisId="volume" 
              dataKey="volume" 
              name="Total Volume" 
              fill="#10B981"
              opacity={0.6} 
              barSize={30}
            />
            <Area
              yAxisId="left"
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
