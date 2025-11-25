
import { CardGradient } from "@/components/ui/card-gradient";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/services/api";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";

interface PortfolioChartProps {
  selectedAssets: string[];
  weights: Record<string, number>;
  days?: number;
}

export default function PortfolioChart({ 
  selectedAssets, 
  weights, 
  days: initialDays = 30 
}: PortfolioChartProps) {
  const safeDays = initialDays || 30;
  const [selectedDays, setSelectedDays] = useState<number>(safeDays);

  // Fetch portfolio price history from API
  const { data: portfolioData, isLoading } = useQuery({
    queryKey: ['portfolio-price-history', selectedAssets, weights, selectedDays],
    queryFn: () => apiService.getPortfolioPriceHistory(selectedAssets, weights, selectedDays),
    enabled: selectedAssets.length > 0 && Object.keys(weights).length > 0,
  });

  if (selectedAssets.length === 0) {
    return (
      <CardGradient className="h-[400px] flex flex-col items-center justify-center">
        <AlertTriangle className="h-8 w-8 text-yellow-500 mb-2" />
        <p className="text-muted-foreground">Please select at least one asset</p>
      </CardGradient>
    );
  }

  if (isLoading) {
    return (
      <CardGradient className="h-[400px] flex items-center justify-center">
        <p className="text-muted-foreground">Loading portfolio data...</p>
      </CardGradient>
    );
  }

  if (!portfolioData?.priceHistory || portfolioData.priceHistory.length === 0) {
    return (
      <CardGradient className="h-[400px] flex items-center justify-center">
        <p className="text-muted-foreground">No portfolio data available</p>
      </CardGradient>
    );
  }

  const chartData = portfolioData.priceHistory;

  const priceMin = Math.min(...chartData.map((d: any) => d.price)) * 0.95;
  const priceMax = Math.max(...chartData.map((d: any) => d.price)) * 1.05;

  return (
    <CardGradient className="h-[500px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Portfolio Performance & Sentiment</h3>
        <div className="flex items-center gap-4">
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
          <div className="flex items-center gap-2">
            <Label htmlFor="period-select" className="text-sm text-muted-foreground">
              Period:
            </Label>
            <Select 
              value={selectedDays.toString()} 
              onValueChange={(value) => {
                setSelectedDays(parseInt(value));
              }}
            >
              <SelectTrigger id="period-select" className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="180">180 days</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
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
              yAxisId="volume"
              orientation="left"
              domain={[0, 'auto']}
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }}
              tickLine={{ stroke: '#4B5563' }}
              label={{ 
                value: 'News Volume', 
                angle: -90, 
                position: 'insideLeft', 
                fill: '#10B981',
                style: { textAnchor: 'middle', fontSize: '12px' }
              }}
            />
            <YAxis 
              yAxisId="sentiment"
              orientation="left"
              domain={[-1, 1]}
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }}
              tickLine={{ stroke: '#4B5563' }}
              label={{ 
                value: 'Sentiment', 
                angle: -90, 
                position: 'insideLeft', 
                fill: '#22D3EE',
                style: { textAnchor: 'middle', fontSize: '12px' }
              }}
            />
            <YAxis 
              yAxisId="price"
              orientation="right"
              domain={[priceMin, priceMax]}
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }}
              tickLine={{ stroke: '#4B5563' }}
              label={{ 
                value: 'Portfolio Value ($)', 
                angle: 90, 
                position: 'insideRight', 
                fill: '#8B5CF6',
                style: { textAnchor: 'middle', fontSize: '12px' }
              }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1A1F2C', borderColor: '#4B5563' }}
              labelStyle={{ color: '#E5E7EB' }}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  // Filter out the Area component (it has no name or name is undefined)
                  const filteredPayload = payload.filter((entry: any) => {
                    // Only show entries with explicit names (Portfolio Value, Total Volume, Portfolio Sentiment)
                    return entry.name && entry.name !== 'price';
                  });
                  
                  return (
                    <div className="bg-[#1A1F2C] border border-[#4B5563] rounded-lg p-3 shadow-lg min-w-[200px]">
                      <p className="text-[#E5E7EB] font-medium mb-2">{label}</p>
                      <div className="space-y-1.5">
                        {filteredPayload.map((entry: any, index: number) => {
                          let formattedValue = '';
                          let displayName = entry.name;
                          
                          if (typeof entry.value === 'number') {
                            if (entry.name === "Portfolio Value") {
                              formattedValue = `$${entry.value.toFixed(2)}`;
                              displayName = "Portfolio Value";
                            } else if (entry.name === "Total Volume") {
                              formattedValue = entry.value.toFixed(2);
                              displayName = "News Volume";
                            } else if (entry.name === "Portfolio Sentiment") {
                              const sentiment = entry.value >= 0.5 ? "Bullish" : entry.value >= 0 ? "Slightly Bullish" : 
                                                entry.value >= -0.5 ? "Slightly Bearish" : "Bearish";
                              formattedValue = `${entry.value.toFixed(2)} (${sentiment})`;
                              displayName = "Market Sentiment";
                            } else {
                              formattedValue = entry.value.toFixed(2);
                            }
                          } else {
                            formattedValue = String(entry.value);
                          }
                          
                          return (
                            <p key={index} style={{ color: entry.color }} className="text-sm">
                              {displayName}: {formattedValue}
                            </p>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend 
              verticalAlign="top"
              height={50}
              wrapperStyle={{ paddingTop: '10px', paddingBottom: '10px' }}
              formatter={(value) => {
                if (value === "Total Volume") return "News Volume";
                if (value === "Portfolio Value") return "Portfolio Value";
                if (value === "Portfolio Sentiment") return "Market Sentiment";
                return value;
              }}
            />
            <Bar 
              yAxisId="volume" 
              dataKey="volume" 
              name="Total Volume" 
              fill="#10B981"
              opacity={0.6} 
              barSize={30}
            />
            <Line 
              yAxisId="price" 
              type="monotone" 
              dataKey="price" 
              name="Portfolio Value" 
              stroke="#8B5CF6" 
              strokeWidth={2}
              dot={false}
            />
            <Line 
              yAxisId="sentiment" 
              type="monotone" 
              dataKey="sentiment" 
              name="Portfolio Sentiment" 
              stroke="#22D3EE" 
              strokeWidth={2}
              dot={false}
            />
            <Area
              yAxisId="price"
              type="monotone"
              dataKey="price"
              fill="#8B5CF6"
              stroke="none"
              opacity={0.1}
              legendType="none"
              hide={true}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </CardGradient>
  );
}

