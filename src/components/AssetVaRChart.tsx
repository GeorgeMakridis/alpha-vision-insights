
import { mockStocks } from "@/data/mockData";
import { useState, useEffect } from "react";
import { 
  Area, 
  CartesianGrid, 
  Line, 
  ComposedChart, 
  Legend, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis,
  ReferenceLine 
} from "recharts";
import { CardGradient } from "./ui/card-gradient";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { 
  Tooltip as UITooltip, 
  TooltipProvider, 
  TooltipTrigger, 
  TooltipContent 
} from "./ui/tooltip";
import { Info, AlertCircle, CircleDashed } from "lucide-react";

interface AssetVaRChartProps {
  ticker: string;
  days?: number;
}

type VaRMethod = {
  key: string;
  name: string;
  color: string;
  confidence: '95' | '99';
}

export default function AssetVaRChart({ ticker, days = 30 }: AssetVaRChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [selectedVaRMethods, setSelectedVaRMethods] = useState<string[]>([
    'parametricVaR95',
    'monteCarloVaR95',
  ]);

  // Define all VaR methods
  const varMethods: VaRMethod[] = [
    { key: 'parametricVaR95', name: 'Parametric VaR 95%', color: '#ef4444', confidence: '95' },
    { key: 'monteCarloVaR95', name: 'Monte Carlo VaR 95%', color: '#f97316', confidence: '95' },
    { key: 'deepVaR95', name: 'Deep VaR 95%', color: '#eab308', confidence: '95' },
    { key: 'parametricVaR99', name: 'Parametric VaR 99%', color: '#ec4899', confidence: '99' },
    { key: 'monteCarloVaR99', name: 'Monte Carlo VaR 99%', color: '#8b5cf6', confidence: '99' },
    { key: 'deepVaR99', name: 'Deep VaR 99%', color: '#06b6d4', confidence: '99' }
  ];

  useEffect(() => {
    // Find the selected stock
    const stock = mockStocks.find((s) => s.ticker === ticker);
    
    if (stock) {
      // Get the price history for the specified number of days
      const priceData = stock.priceHistory.slice(-days);
      
      // Calculate VaR lines values (for visual reference)
      const priceMin = Math.min(...priceData.map(d => d.price)) * 0.95;
      
      // Enhance with VaR breach markers for visualization
      const enhancedData = priceData.map((day) => {
        // Simulate VaR breaches based on price movements (for visualization)
        return {
          ...day,
          // Simulate breaches for each VaR method
          parametricVaR95Breach: Math.random() > 0.95 ? -1 : null,
          monteCarloVaR95Breach: Math.random() > 0.95 ? -1 : null,
          deepVaR95Breach: Math.random() > 0.96 ? -1 : null,
          parametricVaR99Breach: Math.random() > 0.99 ? -1 : null, 
          monteCarloVaR99Breach: Math.random() > 0.99 ? -1 : null,
          deepVaR99Breach: Math.random() > 0.99 ? -1 : null,
          // Add VaR threshold values for the lines
          parametricVaR95Line: priceMin * 1.05,
          monteCarloVaR95Line: priceMin * 1.04,
          deepVaR95Line: priceMin * 1.03,
          parametricVaR99Line: priceMin * 1.02,
          monteCarloVaR99Line: priceMin * 1.01,
          deepVaR99Line: priceMin * 1.00
        };
      });
      
      setChartData(enhancedData);
    } else {
      setChartData([]);
    }
  }, [ticker, days]);

  const toggleVaRMethod = (method: string) => {
    setSelectedVaRMethods(prev => 
      prev.includes(method) 
        ? prev.filter(m => m !== method) 
        : [...prev, method]
    );
  };

  if (chartData.length === 0) {
    return (
      <CardGradient className="h-[400px] flex items-center justify-center">
        <p className="text-muted-foreground">No data available</p>
      </CardGradient>
    );
  }

  // Find min and max for price to set the y-axis domain
  const priceMin = Math.min(...chartData.map((d: any) => d.price)) * 0.95;
  const priceMax = Math.max(...chartData.map((d: any) => d.price)) * 1.05;

  return (
    <CardGradient className="h-[500px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium">Price & VaR Analysis</h3>
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Value at Risk (VaR) shows the expected maximum loss with a specific confidence level. Dots indicate breach events where actual losses exceeded the VaR prediction.</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>
        <div className="flex gap-1 items-center">
          <AlertCircle className="h-4 w-4 text-dashboard-negative mr-1" />
          <span className="text-xs text-muted-foreground">Breach events</span>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-4 mb-4">
        {varMethods.map((method) => (
          <div key={method.key} className="flex items-center space-x-2">
            <Checkbox 
              id={method.key} 
              checked={selectedVaRMethods.includes(method.key)}
              onCheckedChange={() => toggleVaRMethod(method.key)}
              className="data-[state=checked]:bg-[color:var(--method-color)] data-[state=checked]:border-[color:var(--method-color)]"
              style={{ '--method-color': method.color } as React.CSSProperties}
            />
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    <Label 
                      htmlFor={method.key}
                      className="text-sm cursor-pointer"
                    >
                      {method.name}
                    </Label>
                    <CircleDashed className="h-3 w-3 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs font-medium">{method.name}</p>
                  <p className="text-xs mt-1">
                    {method.confidence === '95' 
                      ? 'Expected to be exceeded 5% of the time (1.25 days per month)'
                      : 'Expected to be exceeded 1% of the time (2.5 days per year)'}
                  </p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
        ))}
      </div>
      
      <div className="h-[380px]">
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
              yAxisId="breach" 
              orientation="left" 
              domain={[-1.5, 0.5]}
              hide
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1A1F2C', borderColor: '#4B5563' }}
              labelStyle={{ color: '#E5E7EB' }}
              formatter={(value: any, name: string) => {
                // Format breach values
                if (typeof name === 'string' && name.includes('Breach') && value !== null) {
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
              name="Price" 
              stroke="#9b87f5" 
              strokeWidth={2}
              dot={false}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="price"
              fill="#9b87f5"
              stroke="none"
              opacity={0.05}
            />
            
            {/* VaR Breach Markers - Only show selected ones */}
            {selectedVaRMethods.includes('parametricVaR95') && (
              <Line 
                yAxisId="breach" 
                dataKey="parametricVaR95Breach" 
                name="Parametric VaR 95% Breach" 
                stroke="#ef4444" 
                strokeWidth={0}
                dot={{ r: 6, fill: '#ef4444' }}
              />
            )}
            {selectedVaRMethods.includes('monteCarloVaR95') && (
              <Line 
                yAxisId="breach" 
                dataKey="monteCarloVaR95Breach" 
                name="Monte Carlo VaR 95% Breach" 
                stroke="#f97316" 
                strokeWidth={0}
                dot={{ r: 6, fill: '#f97316' }}
              />
            )}
            {selectedVaRMethods.includes('deepVaR95') && (
              <Line 
                yAxisId="breach" 
                dataKey="deepVaR95Breach" 
                name="Deep VaR 95% Breach" 
                stroke="#eab308" 
                strokeWidth={0}
                dot={{ r: 6, fill: '#eab308' }}
              />
            )}
            {selectedVaRMethods.includes('parametricVaR99') && (
              <Line 
                yAxisId="breach" 
                dataKey="parametricVaR99Breach" 
                name="Parametric VaR 99% Breach" 
                stroke="#ec4899" 
                strokeWidth={0}
                dot={{ r: 8, fill: '#ec4899', stroke: '#ffffff', strokeWidth: 1 }}
              />
            )}
            {selectedVaRMethods.includes('monteCarloVaR99') && (
              <Line 
                yAxisId="breach" 
                dataKey="monteCarloVaR99Breach" 
                name="Monte Carlo VaR 99% Breach" 
                stroke="#8b5cf6" 
                strokeWidth={0}
                dot={{ r: 8, fill: '#8b5cf6', stroke: '#ffffff', strokeWidth: 1 }}
              />
            )}
            {selectedVaRMethods.includes('deepVaR99') && (
              <Line 
                yAxisId="breach" 
                dataKey="deepVaR99Breach" 
                name="Deep VaR 99% Breach" 
                stroke="#06b6d4" 
                strokeWidth={0}
                dot={{ r: 8, fill: '#06b6d4', stroke: '#ffffff', strokeWidth: 1 }}
              />
            )}
            
            {/* VaR level lines - Show only the selected ones */}
            {selectedVaRMethods.includes('parametricVaR95') && (
              <Line 
                yAxisId="left" 
                type="monotone" 
                dataKey="parametricVaR95Line" 
                name="Parametric VaR 95%" 
                stroke="#ef4444" 
                dot={false}
                strokeDasharray="3 3" 
              />
            )}
            {selectedVaRMethods.includes('monteCarloVaR95') && (
              <Line 
                yAxisId="left" 
                type="monotone" 
                dataKey="monteCarloVaR95Line" 
                name="Monte Carlo VaR 95%" 
                stroke="#f97316" 
                dot={false}
                strokeDasharray="3 3" 
              />
            )}
            {selectedVaRMethods.includes('deepVaR95') && (
              <Line 
                yAxisId="left" 
                type="monotone" 
                dataKey="deepVaR95Line" 
                name="Deep VaR 95%" 
                stroke="#eab308" 
                dot={false}
                strokeDasharray="3 3" 
              />
            )}
            {selectedVaRMethods.includes('parametricVaR99') && (
              <Line 
                yAxisId="left" 
                type="monotone" 
                dataKey="parametricVaR99Line" 
                name="Parametric VaR 99%" 
                stroke="#ec4899" 
                dot={false}
                strokeDasharray="3 3" 
              />
            )}
            {selectedVaRMethods.includes('monteCarloVaR99') && (
              <Line 
                yAxisId="left" 
                type="monotone" 
                dataKey="monteCarloVaR99Line" 
                name="Monte Carlo VaR 99%" 
                stroke="#8b5cf6" 
                dot={false}
                strokeDasharray="3 3" 
              />
            )}
            {selectedVaRMethods.includes('deepVaR99') && (
              <Line 
                yAxisId="left" 
                type="monotone" 
                dataKey="deepVaR99Line" 
                name="Deep VaR 99%" 
                stroke="#06b6d4" 
                dot={false}
                strokeDasharray="3 3" 
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </CardGradient>
  );
}
