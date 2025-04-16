
import { CardGradient } from "@/components/ui/card-gradient";
import { mockStocks } from "@/data/mockData";
import { AlertTriangle } from "lucide-react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface PortfolioAllocationChartProps {
  selectedAssets: string[];
  weights: Record<string, number>;
}

export default function PortfolioAllocationChart({
  selectedAssets,
  weights,
}: PortfolioAllocationChartProps) {
  if (selectedAssets.length === 0) {
    return (
      <CardGradient className="h-[300px] flex flex-col items-center justify-center">
        <AlertTriangle className="h-8 w-8 text-yellow-500 mb-2" />
        <p className="text-muted-foreground">Please select at least one asset</p>
      </CardGradient>
    );
  }
  
  // Prepare data for pie chart
  const data = selectedAssets.map(ticker => {
    const stock = mockStocks.find(s => s.ticker === ticker);
    return {
      name: ticker,
      fullName: stock?.name,
      value: weights[ticker] * 100,
      color: getStockColor(ticker)
    };
  });
  
  return (
    <CardGradient className="h-[300px]">
      <h3 className="text-lg font-medium mb-4">Portfolio Allocation</h3>
      
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
              label={({ name, value }) => `${name} ${value.toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [`${value.toFixed(1)}%`, 'Allocation']}
              contentStyle={{ backgroundColor: '#1A1F2C', borderColor: '#4B5563' }}
              labelStyle={{ color: '#E5E7EB' }}
              itemStyle={{ color: '#E5E7EB' }}
            />
            <Legend 
              layout="horizontal" 
              verticalAlign="bottom"
              align="center"
              formatter={(value: string, entry: any) => {
                const item = data.find(d => d.name === value);
                return <span style={{ color: '#E5E7EB' }}>{value} - {item?.fullName}</span>;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </CardGradient>
  );
}

// Generate colors for stocks
function getStockColor(ticker: string): string {
  // Define a set of colors for the pie chart
  const colors = [
    '#8B5CF6', // Purple (primary)
    '#9b87f5', // Light purple (secondary)
    '#4f46e5', // Indigo
    '#6366f1', // Lighter indigo
    '#3b82f6', // Blue
    '#60a5fa', // Light blue
    '#0ea5e9', // Sky
    '#22d3ee', // Cyan
    '#14b8a6', // Teal
    '#34d399', // Emerald
    '#22c55e', // Green
    '#a3e635', // Lime
  ];
  
  // Use the ticker's charCode sum to deterministically select a color
  const charCodeSum = ticker.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  
  return colors[charCodeSum % colors.length];
}
