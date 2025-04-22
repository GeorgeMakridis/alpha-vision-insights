import { mockStocks } from "@/data/mockData";
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
  YAxis 
} from "recharts";
import { CardGradient } from "./ui/card-gradient";
import { 
  Tooltip as UITooltip, 
  TooltipProvider, 
  TooltipTrigger, 
  TooltipContent 
} from "./ui/tooltip";
import { Info } from "lucide-react";

interface AssetChartProps {
  ticker: string;
  days?: number;
}

export default function AssetChart({ ticker, days = 30 }: AssetChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const stock = mockStocks.find((s) => s.ticker === ticker);
    
    if (stock) {
      const data = stock.priceHistory.slice(-days);
      setChartData(data);
    } else {
      setChartData([]);
    }
  }, [ticker, days]);

  if (chartData.length === 0) {
    return (
      <CardGradient className="h-[400px] flex items-center justify-center">
        <p className="text-muted-foreground">No data available</p>
      </CardGradient>
    );
  }

  const priceMin = Math.min(...chartData.map(d => d.price)) * 0.95;
  const priceMax = Math.max(...chartData.map(d => d.price)) * 1.05;

  const tooltipFormatter = (value: any, name: string) => {
    switch (name) {
      case "Price":
        return [`$${value.toFixed(2)}`, "Asset Price"];
      case "Sentiment":
        const sentiment = value >= 0.5 ? "Bullish" : value >= 0 ? "Slightly Bullish" : 
                           value >= -0.5 ? "Slightly Bearish" : "Bearish";
        return [`${value.toFixed(2)} (${sentiment})`, "Market Sentiment"];
      case "News Volume":
        return [value, "News Articles"];
      default:
        return [value, name];
    }
  };

  return (
    <CardGradient className="h-[400px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Price & Market Sentiment</h3>
        <TooltipProvider>
          <UITooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-medium mb-1">Chart Guide</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><span className="text-[#8B5CF6] font-medium">Price</span>: Asset price trajectory</li>
                <li><span className="text-[#22D3EE] font-medium">Sentiment</span>: Market sentiment (-1 to 1)</li>
                <li><span className="text-[#10B981] font-medium">Volume</span>: News activity level</li>
              </ul>
            </TooltipContent>
          </UITooltip>
        </TooltipProvider>
      </div>
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart 
            data={chartData} 
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            barGap={0}
            stackOffset="sign"
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
              domain={[priceMin, priceMax]}
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }}
              tickLine={{ stroke: '#4B5563' }}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
              label={{ 
                value: 'Price', 
                angle: 90, 
                position: 'insideRight', 
                fill: '#8B5CF6',
                style: { textAnchor: 'middle' }
              }}
            />
            <YAxis 
              yAxisId="sentiment"
              orientation="left"
              domain={[-1, 1]}
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }}
              tickLine={{ stroke: '#4B5563' }}
              tickFormatter={(value) => value.toFixed(1)}
              label={{ 
                value: 'Sentiment', 
                angle: -90, 
                position: 'insideLeft', 
                fill: '#22D3EE',
                style: { textAnchor: 'middle' }
              }}
            />
            <YAxis 
              yAxisId="volume"
              orientation="left"
              domain={[0, 'auto']}
              hide={true}
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
              formatter={(value) => {
                if (value === "Price") return "Price";
                if (value === "News Volume") return "News Articles";
                if (value === "Sentiment") return "Market Sentiment";
                return value;
              }}
            />
            
            <Bar 
              yAxisId="volume" 
              dataKey="volume" 
              name="News Volume" 
              fill="#10B981"
              opacity={0.7} 
              barSize={20}
              isAnimationActive={false}
            />
            
            <Line 
              yAxisId="price" 
              type="monotone" 
              dataKey="price" 
              name="Price" 
              stroke="#8B5CF6" 
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 6, stroke: '#8B5CF6', strokeWidth: 1, fill: '#8B5CF6' }}
            />
            <Line 
              yAxisId="sentiment" 
              type="monotone" 
              dataKey="sentiment" 
              name="Sentiment" 
              stroke="#22D3EE" 
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 6, stroke: '#22D3EE', strokeWidth: 1, fill: '#22D3EE' }}
            />
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
