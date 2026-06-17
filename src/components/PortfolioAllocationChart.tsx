
import { CardGradient } from "@/components/ui/card-gradient";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/services/api";
import { AlertTriangle } from "lucide-react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface PortfolioAllocationChartProps {
  selectedAssets: string[];
  weights: Record<string, number>;
  includeCash?: boolean;
  cashWeight?: number;
  preview?: boolean;
}

const CASH_COLOR = "#64748b";

export default function PortfolioAllocationChart({
  selectedAssets,
  weights,
  includeCash = false,
  cashWeight = 0,
  preview = false,
}: PortfolioAllocationChartProps) {
  const { data: stocksData } = useQuery({
    queryKey: ['stocks'],
    queryFn: () => apiService.getStocks(),
  });

  if (selectedAssets.length === 0) {
    return (
      <CardGradient className="min-h-[340px] flex flex-col items-center justify-center">
        <AlertTriangle className="h-8 w-8 text-yellow-500 mb-2" />
        <p className="text-muted-foreground">Please select at least one asset</p>
      </CardGradient>
    );
  }

  const data = selectedAssets.map((ticker) => {
    const stock = stocksData?.stocks?.find((s) => s.ticker === ticker);
    return {
      name: ticker,
      fullName: stock?.name || ticker,
      value: (weights[ticker] ?? 0) * 100,
      color: getStockColor(ticker),
    };
  });

  if (includeCash && cashWeight > 0) {
    data.push({
      name: "Cash",
      fullName: "Cash (zero return)",
      value: cashWeight * 100,
      color: CASH_COLOR,
    });
  }

  return (
    <CardGradient className="min-h-[340px]">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h3 className="text-lg font-medium">Portfolio Allocation</h3>
          {preview && (
            <span className="text-xs text-yellow-500/90 mt-0.5 block">
              Preview — click Apply to update risk charts
            </span>
          )}
          {includeCash && (
            <p className="text-xs text-muted-foreground mt-1">
              Cash has no return; risk metrics reflect full allocation including cash.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-4 h-[260px]">
        <div className="flex-1 h-[220px] lg:h-[260px] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="45%"
                innerRadius={55}
                outerRadius={75}
                paddingAngle={2}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, _name: string, item: { payload?: { fullName?: string } }) => {
                  const label = item?.payload?.fullName ?? _name;
                  return [`${value.toFixed(2)}%`, label];
                }}
                contentStyle={{ backgroundColor: "#1A1F2C", borderColor: "#4B5563" }}
                labelStyle={{ color: "#E5E7EB" }}
                itemStyle={{ color: "#E5E7EB" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <ul className="lg:w-40 shrink-0 space-y-1.5 text-xs max-h-[200px] overflow-y-auto pr-1">
          {data.map((entry) => (
            <li key={entry.name} className="flex items-center gap-2">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-slate-200 font-medium">{entry.name}</span>
              <span className="text-muted-foreground ml-auto">{entry.value.toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </CardGradient>
  );
}

function getStockColor(ticker: string): string {
  const colors = [
    "#8B5CF6",
    "#9b87f5",
    "#4f46e5",
    "#6366f1",
    "#3b82f6",
    "#60a5fa",
    "#0ea5e9",
    "#22d3ee",
    "#14b8a6",
    "#34d399",
    "#22c55e",
    "#a3e635",
  ];
  const charCodeSum = ticker.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return colors[charCodeSum % colors.length];
}
