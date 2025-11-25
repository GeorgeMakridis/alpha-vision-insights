import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/services/api";
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
} from "recharts";
import { CardGradient } from "./ui/card-gradient";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { 
  Tooltip as UITooltip, 
  TooltipProvider, 
  TooltipTrigger, 
  TooltipContent 
} from "./ui/tooltip";
import { Info, CircleDashed } from "lucide-react";

interface AssetVaRChartProps {
  ticker: string;
  days?: number;
  onDaysChange?: (days: number) => void;
}

type VaRMethod = {
  key: string;
  name: string;
  color: string;
  confidence: '95' | '99';
}

export default function AssetVaRChart({ ticker, days: initialDays = 60, onDaysChange }: AssetVaRChartProps) {
  // Fixed rolling window: 252 days (1 trading year)
  const ROLLING_WINDOW = 252;
  
  // Ensure ticker is always a string to prevent query key issues
  const safeTicker = ticker || '';
  const safeDays = initialDays || 60;
  
  // All useState hooks must be called first, in the same order every render
  const [chartData, setChartData] = useState<any[]>([]);
  const [selectedDays, setSelectedDays] = useState<number>(safeDays);
  const [selectedVaRMethods, setSelectedVaRMethods] = useState<string[]>([
    'parametricVaR95',
    'monteCarloVaR95',
    'blnnVaR95',
  ]);
  
  // Sync local state with prop when it changes from parent (only if different to avoid loops)
  useEffect(() => {
    if (safeDays !== selectedDays) {
      setSelectedDays(safeDays);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeDays]);

  // Note: We no longer need separate price history - time-series VaR endpoint includes prices

  // Fetch time-series VaR data (with fixed rolling window of 252 days)
  // Always call useQuery unconditionally - use enabled flag to control execution
  const { data: varTimeSeriesData, isLoading: varTimeSeriesLoading, error: varTimeSeriesError } = useQuery({
    queryKey: ['var-timeseries', safeTicker, selectedDays, ROLLING_WINDOW],
    queryFn: () => {
      if (!safeTicker) {
        throw new Error('Ticker is required');
      }
      return apiService.getVarTimeSeries(safeTicker, selectedDays, ROLLING_WINDOW);
    },
    enabled: !!safeTicker && !!selectedDays,
  });

  const varMethods: VaRMethod[] = [
    { key: 'parametricVaR95', name: 'Parametric VaR 95%', color: '#ef4444', confidence: '95' },
    { key: 'monteCarloVaR95', name: 'Monte Carlo VaR 95%', color: '#f97316', confidence: '95' },
    { key: 'deepVaR95', name: 'Deep VaR 95%', color: '#eab308', confidence: '95' },
    { key: 'blnnVaR95', name: 'BLNNVaR 95%', color: '#10b981', confidence: '95' },
    { key: 'parametricVaR99', name: 'Parametric VaR 99%', color: '#ec4899', confidence: '99' },
    { key: 'monteCarloVaR99', name: 'Monte Carlo VaR 99%', color: '#8b5cf6', confidence: '99' },
    { key: 'deepVaR99', name: 'Deep VaR 99%', color: '#06b6d4', confidence: '99' },
    { key: 'blnnVaR99', name: 'BLNNVaR 99%', color: '#14b8a6', confidence: '99' }
  ];

  useEffect(() => {
    try {
      if (varTimeSeriesData?.timeseries && Array.isArray(varTimeSeriesData.timeseries)) {
        // Use time-series VaR data directly from backend
        // This data already has VaR calculated for each day using rolling window
        const enhancedData = varTimeSeriesData.timeseries
          .filter((day) => day && typeof day === 'object' && day.date && typeof day.price === 'number')
          .map((day) => {
            // Identify breaches: price < VaR price level (VaR is negative, so price < VaR price means breach)
            // Initialize breach flags as false instead of using spread operator
            const result: any = {
              date: day.date,
              price: day.price,
              // VaR price levels (already calculated in backend)
              parametricVaR95Line: (day.parametricVaR95Price && day.parametricVaR95Price > 0) ? day.parametricVaR95Price : day.price,
              monteCarloVaR95Line: (day.monteCarloVaR95Price && day.monteCarloVaR95Price > 0) ? day.monteCarloVaR95Price : day.price,
              deepVaR95Line: (day.deepVaR95Price && day.deepVaR95Price > 0) ? day.deepVaR95Price : day.price,
              blnnVaR95Line: (day.blnnVaR95Price && day.blnnVaR95Price > 0) ? day.blnnVaR95Price : day.price,
              parametricVaR99Line: (day.parametricVaR99Price && day.parametricVaR99Price > 0) ? day.parametricVaR99Price : day.price,
              monteCarloVaR99Line: (day.monteCarloVaR99Price && day.monteCarloVaR99Price > 0) ? day.monteCarloVaR99Price : day.price,
              deepVaR99Line: (day.deepVaR99Price && day.deepVaR99Price > 0) ? day.deepVaR99Price : day.price,
              blnnVaR99Line: (day.blnnVaR99Price && day.blnnVaR99Price > 0) ? day.blnnVaR99Price : day.price,
              // VaR percentages for tooltip
              parametricVaR95Pct: day.parametricVaR95 || 0,
              monteCarloVaR95Pct: day.monteCarloVaR95 || 0,
              deepVaR95Pct: day.deepVaR95 || 0,
              blnnVaR95Pct: day.blnnVaR95 || 0,
              parametricVaR99Pct: day.parametricVaR99 || 0,
              monteCarloVaR99Pct: day.monteCarloVaR99 || 0,
              deepVaR99Pct: day.deepVaR99 || 0,
              blnnVaR99Pct: day.blnnVaR99 || 0,
            };
            
            return result;
          });
        
        setChartData(enhancedData);
      } else {
        setChartData([]);
      }
    } catch (error) {
      console.error('Error processing VaR time-series data:', error);
      setChartData([]);
    }
  }, [varTimeSeriesData]);

  const toggleVaRMethod = (method: string) => {
    setSelectedVaRMethods(prev => 
      prev.includes(method) 
        ? prev.filter(m => m !== method) 
        : [...prev, method]
    );
  };

  if (varTimeSeriesError) {
    return (
      <CardGradient className="h-[400px] flex items-center justify-center">
        <p className="text-dashboard-negative">Error loading VaR data: {varTimeSeriesError.message}</p>
      </CardGradient>
    );
  }

  if (varTimeSeriesLoading) {
    return (
      <CardGradient className="h-[400px] flex items-center justify-center">
        <p className="text-muted-foreground">Loading VaR analysis...</p>
      </CardGradient>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <CardGradient className="h-[400px] flex items-center justify-center">
        <p className="text-muted-foreground">No data available for {safeTicker || 'selected asset'}</p>
      </CardGradient>
    );
  }

  // Safely calculate price min/max with fallbacks
  const prices = chartData.map((d: any) => d?.price).filter((p: any) => typeof p === 'number' && !isNaN(p));
  if (prices.length === 0) {
    return (
      <CardGradient className="h-[400px] flex items-center justify-center">
        <p className="text-muted-foreground">Invalid price data for {safeTicker || 'selected asset'}</p>
      </CardGradient>
    );
  }

  const priceMin = Math.min(...prices) * 0.95;
  const priceMax = Math.max(...prices) * 1.05;

  // Format y-axis values
  const formatYAxisValue = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value.toFixed(0)}`;
  };

  // Format tooltip values
  const formatTooltipValue = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

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
                <p>Value at Risk (VaR) shows the expected maximum loss with a specific confidence level. The VaR lines represent price thresholds that should be breached only in rare cases.</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="period-select" className="text-sm text-muted-foreground">
              Period:
            </Label>
            <Select 
              value={selectedDays.toString()} 
              onValueChange={(value) => {
                const newDays = parseInt(value);
                setSelectedDays(newDays);
                if (onDaysChange) {
                  onDaysChange(newDays);
                }
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
              tickFormatter={formatYAxisValue}
              label={{ 
                value: 'Price ($)', 
                angle: -90, 
                position: 'insideLeft', 
                fill: '#9CA3AF',
                style: { textAnchor: 'middle', fontSize: '12px' }
              }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1A1F2C', borderColor: '#4B5563' }}
              labelStyle={{ color: '#E5E7EB' }}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  // Filter out duplicate entries - only show unique dataKeys
                  const seen = new Set<string>();
                  const filteredPayload = payload.filter((entry: any) => {
                    // Skip the Area component (it has no dataKey or same as Line)
                    if (!entry.dataKey || entry.dataKey === 'price') {
                      if (seen.has('price')) {
                        return false; // Skip duplicate price entries
                      }
                      seen.add('price');
                    } else {
                      const key = entry.dataKey as string;
                      if (seen.has(key)) {
                        return false;
                      }
                      seen.add(key);
                    }
                    return true;
                  });

                  // Get the data point to access VaR percentages
                  const dataPoint = chartData.find((d: any) => d.date === label);
                  
                  return (
                    <div className="bg-[#1A1F2C] border border-[#4B5563] rounded-lg p-3 shadow-lg min-w-[200px]">
                      <p className="text-[#E5E7EB] font-medium mb-2">{label}</p>
                      <div className="space-y-1.5">
                        {filteredPayload.map((entry: any, index: number) => {
                          return (
                            <p key={index} style={{ color: entry.color }} className="text-sm">
                              {entry.name || entry.dataKey}: {formatTooltipValue(entry.value)}
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
              height={80}
              wrapperStyle={{ paddingTop: '10px', paddingBottom: '10px' }}
              formatter={(value) => {
                // Shorten VaR method names for better display
                if (value.includes('Parametric VaR 95%')) return 'Parametric 95%';
                if (value.includes('Monte Carlo VaR 95%')) return 'Monte Carlo 95%';
                if (value.includes('Deep VaR 95%')) return 'Deep VaR 95%';
                if (value.includes('BLNNVaR 95%')) return 'BLNNVaR 95%';
                if (value.includes('Parametric VaR 99%')) return 'Parametric 99%';
                if (value.includes('Monte Carlo VaR 99%')) return 'Monte Carlo 99%';
                if (value.includes('Deep VaR 99%')) return 'Deep VaR 99%';
                if (value.includes('BLNNVaR 99%')) return 'BLNNVaR 99%';
                return value;
              }}
            />
            <Line 
              yAxisId="left" 
              type="natural" 
              dataKey="price" 
              name="Price" 
              stroke="#9b87f5" 
              strokeWidth={2}
              dot={false}
            />
            <Area
              yAxisId="left"
              type="natural"
              dataKey="price"
              fill="#9b87f5"
              stroke="none"
              opacity={0.05}
              legendType="none"
              hide={true}
            />
            
            {selectedVaRMethods.includes('parametricVaR95') && (
              <Line 
                yAxisId="left" 
                type="natural" 
                dataKey="parametricVaR95Line" 
                name="Parametric VaR 95%" 
                stroke="#ef4444" 
                dot={false}
                strokeDasharray="3 3" 
                strokeWidth={1.5}
              />
            )}
            {selectedVaRMethods.includes('monteCarloVaR95') && (
              <Line 
                yAxisId="left" 
                type="natural" 
                dataKey="monteCarloVaR95Line" 
                name="Monte Carlo VaR 95%" 
                stroke="#f97316" 
                dot={false}
                strokeDasharray="3 3" 
                strokeWidth={1.5}
              />
            )}
            {selectedVaRMethods.includes('deepVaR95') && (
              <Line 
                yAxisId="left" 
                type="natural" 
                dataKey="deepVaR95Line" 
                name="Deep VaR 95%" 
                stroke="#eab308" 
                dot={false}
                strokeDasharray="3 3" 
                strokeWidth={1.5}
              />
            )}
            {selectedVaRMethods.includes('parametricVaR99') && (
              <Line 
                yAxisId="left" 
                type="natural" 
                dataKey="parametricVaR99Line" 
                name="Parametric VaR 99%" 
                stroke="#ec4899" 
                dot={false}
                strokeDasharray="3 3" 
                strokeWidth={1.5}
              />
            )}
            {selectedVaRMethods.includes('monteCarloVaR99') && (
              <Line 
                yAxisId="left" 
                type="natural" 
                dataKey="monteCarloVaR99Line" 
                name="Monte Carlo VaR 99%" 
                stroke="#8b5cf6" 
                dot={false}
                strokeDasharray="3 3" 
                strokeWidth={1.5}
              />
            )}
            {selectedVaRMethods.includes('deepVaR99') && (
              <Line 
                yAxisId="left" 
                type="natural" 
                dataKey="deepVaR99Line" 
                name="Deep VaR 99%" 
                stroke="#06b6d4" 
                dot={false}
                strokeDasharray="3 3" 
                strokeWidth={1.5}
              />
            )}
            {selectedVaRMethods.includes('blnnVaR95') && (
              <Line 
                yAxisId="left" 
                type="natural" 
                dataKey="blnnVaR95Line" 
                name="BLNNVaR 95%" 
                stroke="#10b981" 
                dot={false}
                strokeDasharray="3 3" 
                strokeWidth={1.5}
              />
            )}
            {selectedVaRMethods.includes('blnnVaR99') && (
              <Line 
                yAxisId="left" 
                type="natural" 
                dataKey="blnnVaR99Line" 
                name="BLNNVaR 99%" 
                stroke="#14b8a6" 
                dot={false}
                strokeDasharray="3 3" 
                strokeWidth={1.5}
              />
            )}
            
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </CardGradient>
  );
}
