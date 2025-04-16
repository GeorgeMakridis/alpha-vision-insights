
import { CardGradient } from "@/components/ui/card-gradient";
import { calculatePortfolioPriceHistory } from "@/data/mockData";
import { AlertTriangle } from "lucide-react";
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
    
    // Add VaR breach markers - simulate breaches for visualization
    const enhancedData = filteredData.map((day: any) => {
      // Simulate VaR breaches based on price movements
      // In a real system, these would be calculated from actual return data
      const dailyReturn = day.return || 0;
      
      return {
        ...day,
        // A breach occurs when the actual return is worse than the VaR prediction
        // These values would typically come from comparing actual returns to VaR thresholds
        parametricVaR95Breach: Math.random() > 0.95 ? -1 : null,
        monteCarloVaR95Breach: Math.random() > 0.95 ? -1 : null,
        deepVaR95Breach: Math.random() > 0.96 ? -1 : null,
        parametricVaR99Breach: Math.random() > 0.99 ? -1 : null, 
        monteCarloVaR99Breach: Math.random() > 0.99 ? -1 : null,
        deepVaR99Breach: Math.random() > 0.99 ? -1 : null
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
      <h3 className="text-lg font-medium mb-4">Portfolio Performance & VaR Analysis</h3>
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
              label={{ value: 'Price ($)', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
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
            <YAxis 
              yAxisId="breach" 
              orientation="left" 
              domain={[-1.5, 0.5]}
              hide
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1A1F2C', borderColor: '#4B5563' }}
              labelStyle={{ color: '#E5E7EB' }}
              formatter={(value, name) => {
                // Format breach values
                if (name.includes('Breach') && value !== null) {
                  return ['VaR Breach', ''];
                }
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
              stroke="#9b87f5" 
              strokeWidth={2}
              dot={false}
            />
            <Line 
              yAxisId="right" 
              type="monotone" 
              dataKey="sentiment" 
              name="Portfolio Sentiment" 
              stroke="#8B5CF6" 
              strokeWidth={2}
              dot={false}
            />
            <Bar 
              yAxisId="volume" 
              dataKey="volume" 
              name="Total Volume" 
              fill="#3730a3"
              opacity={0.6} 
              barSize={30}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="price"
              fill="#9b87f5"
              stroke="none"
              opacity={0.05}
            />
            
            {/* VaR Breach Markers */}
            <Line 
              yAxisId="breach" 
              dataKey="parametricVaR95Breach" 
              name="Parametric VaR 95% Breach" 
              stroke="#ef4444" 
              strokeWidth={0}
              dot={{ r: 6, fill: '#ef4444' }}
            />
            <Line 
              yAxisId="breach" 
              dataKey="monteCarloVaR95Breach" 
              name="Monte Carlo VaR 95% Breach" 
              stroke="#f97316" 
              strokeWidth={0}
              dot={{ r: 6, fill: '#f97316' }}
            />
            <Line 
              yAxisId="breach" 
              dataKey="deepVaR95Breach" 
              name="Deep VaR 95% Breach" 
              stroke="#eab308" 
              strokeWidth={0}
              dot={{ r: 6, fill: '#eab308' }}
            />
            <Line 
              yAxisId="breach" 
              dataKey="parametricVaR99Breach" 
              name="Parametric VaR 99% Breach" 
              stroke="#ec4899" 
              strokeWidth={0}
              dot={{ r: 8, fill: '#ec4899', stroke: '#ffffff', strokeWidth: 1 }}
            />
            <Line 
              yAxisId="breach" 
              dataKey="monteCarloVaR99Breach" 
              name="Monte Carlo VaR 99% Breach" 
              stroke="#8b5cf6" 
              strokeWidth={0}
              dot={{ r: 8, fill: '#8b5cf6', stroke: '#ffffff', strokeWidth: 1 }}
            />
            <Line 
              yAxisId="breach" 
              dataKey="deepVaR99Breach" 
              name="Deep VaR 99% Breach" 
              stroke="#06b6d4" 
              strokeWidth={0}
              dot={{ r: 8, fill: '#06b6d4', stroke: '#ffffff', strokeWidth: 1 }}
            />
            
            {/* Reference lines for VaR levels */}
            <ReferenceLine 
              y={priceMin * 1.05} 
              yAxisId="left" 
              label={{ value: 'VaR 95%', position: 'insideBottomLeft', fill: '#ef4444' }} 
              stroke="#ef4444" 
              strokeDasharray="3 3" 
            />
            <ReferenceLine 
              y={priceMin * 1.02} 
              yAxisId="left" 
              label={{ value: 'VaR 99%', position: 'insideBottomLeft', fill: '#ec4899' }} 
              stroke="#ec4899" 
              strokeDasharray="3 3" 
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </CardGradient>
  );
}
