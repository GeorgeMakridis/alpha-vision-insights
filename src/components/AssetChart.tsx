
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

interface AssetChartProps {
  ticker: string;
  days?: number;
}

export default function AssetChart({ ticker, days = 30 }: AssetChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    // Find the selected stock
    const stock = mockStocks.find((s) => s.ticker === ticker);
    
    if (stock) {
      // Get the price history for the specified number of days
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

  // Find min and max for price to set the y-axis domain
  const priceMin = Math.min(...chartData.map(d => d.price)) * 0.95;
  const priceMax = Math.max(...chartData.map(d => d.price)) * 1.05;

  return (
    <CardGradient className="h-[400px]">
      <h3 className="text-lg font-medium mb-4">Price, Sentiment & Volume Analysis</h3>
      <div className="h-[320px]">
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
            <Tooltip 
              contentStyle={{ backgroundColor: '#1A1F2C', borderColor: '#4B5563' }}
              labelStyle={{ color: '#E5E7EB' }}
            />
            <Legend />
            <Line 
              yAxisId="left" 
              type="monotone" 
              dataKey="price" 
              name="Price" 
              stroke="#9b87f5" 
              strokeWidth={2}
              dot={false}
            />
            <Line 
              yAxisId="right" 
              type="monotone" 
              dataKey="sentiment" 
              name="Sentiment" 
              stroke="#8B5CF6" 
              strokeWidth={2}
              dot={false}
            />
            <Bar 
              yAxisId="volume" 
              dataKey="volume" 
              name="Volume" 
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
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </CardGradient>
  );
}
