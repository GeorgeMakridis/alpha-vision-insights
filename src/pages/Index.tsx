import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import AssetSelector from "@/components/AssetSelector";
import AssetInfoCard from "@/components/AssetInfoCard";
import AssetChart from "@/components/AssetChart";
import AssetVaRChart from "@/components/AssetVaRChart";
import VaRSummaryStatistics from "@/components/VaRSummaryStatistics";
import PortfolioAssetSelector from "@/components/PortfolioAssetSelector";
import PortfolioMetricsCard from "@/components/PortfolioMetricsCard";
import PortfolioAllocationChart from "@/components/PortfolioAllocationChart";
import PortfolioChart from "@/components/PortfolioChart";
import PortfolioVaRChart from "@/components/PortfolioVaRChart";
import AssetNewsHeadlines from "@/components/AssetNewsHeadlines";
import RiskChatbot from "@/components/RiskChatbot";
import ComplianceStrip from "@/components/legal/ComplianceStrip";
import SiteFooter from "@/components/layout/SiteFooter";
import { apiService } from "@/services/api";
import { TAGLINE } from "@/constants/legal";
import { BarChart, TrendingUp } from "lucide-react";

function weightsMatch(
  a: Record<string, number>,
  b: Record<string, number>
): boolean {
  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => Math.abs((a[k] ?? 0) - (b[k] ?? 0)) < 1e-6);
}

const Index = () => {
  // Asset Analysis state
  const [selectedAsset, setSelectedAsset] = useState<string>("AAPL");
  const [selectedDays, setSelectedDays] = useState<number>(60); // Default period for charts and backtesting
  
  // Portfolio Analysis state
  const [selectedPortfolioAssets, setSelectedPortfolioAssets] = useState<string[]>([]);
  const [portfolioWeights, setPortfolioWeights] = useState<Record<string, number>>({});
  const [portfolioDays, setPortfolioDays] = useState<number>(60); // Default period for portfolio charts
  const [tempWeights, setTempWeights] = useState<Record<string, number>>({});
  const [includeCash, setIncludeCash] = useState<boolean>(false);
  const [appliedIncludeCash, setAppliedIncludeCash] = useState<boolean>(false);
  const [cashWeight, setCashWeight] = useState<number>(0);
  
  // API queries for data fetching
  const { data: stocksData, isLoading: stocksLoading } = useQuery({
    queryKey: ['stocks'],
    queryFn: () => apiService.getStocks(),
  });
  
  // Initialize with some default portfolio assets
  useEffect(() => {
    const defaultAssets = ["AAPL", "MSFT", "GOOGL"];
    setSelectedPortfolioAssets(defaultAssets);
    
    // Set equal weights initially
    const equalWeight = 1 / defaultAssets.length;
    const initialWeights: Record<string, number> = {};
    defaultAssets.forEach(ticker => {
      initialWeights[ticker] = equalWeight;
    });
    setPortfolioWeights(initialWeights);
    setTempWeights(initialWeights);
  }, []);
  
  // Handle asset selection - automatically add to portfolio
  const handleAssetSelect = (ticker: string) => {
    setSelectedAsset(ticker);
    
    // Automatically add to portfolio if not already included
    if (!selectedPortfolioAssets.includes(ticker)) {
      const newPortfolioAssets = [...selectedPortfolioAssets, ticker];
      setSelectedPortfolioAssets(newPortfolioAssets);

      const equalWeight = 1 / newPortfolioAssets.length;
      const newWeights: Record<string, number> = {};
      newPortfolioAssets.forEach((asset) => {
        newWeights[asset] = equalWeight;
      });
      setTempWeights(newWeights);
    }
  };
  
  // Handle portfolio asset selection
  const handlePortfolioAssetSelect = (ticker: string, selected: boolean) => {
    if (selected) {
      // Add the asset to the portfolio
      setSelectedPortfolioAssets(prev => {
        const newAssets = [...prev, ticker];
        
        // Update temp weights with equal distribution
        setTempWeights((prevWeights) => {
          const newWeights: Record<string, number> = {};
          const equalWeight = 1 / newAssets.length;
          newAssets.forEach((t) => {
            newWeights[t] = equalWeight;
          });
          return newWeights;
        });

        return newAssets;
      });
    } else {
      // Remove the asset from the portfolio
      setSelectedPortfolioAssets(prev => {
        const newAssets = prev.filter(t => t !== ticker);
        
        // Update temp weights
        setTempWeights((prevWeights) => {
          const newWeights: Record<string, number> = {};
          if (newAssets.length > 0) {
            const equalWeight = 1 / newAssets.length;
            newAssets.forEach((t) => {
              newWeights[t] = equalWeight;
            });
          }
          return newWeights;
        });

        return newAssets;
      });
    }
  };
  
  // Handle portfolio weight change (temporary, doesn't auto-normalize)
  const handleWeightChange = (ticker: string, weight: number) => {
    setTempWeights(prev => {
      const newWeights = { ...prev, [ticker]: weight / 100 }; // Store as decimal
      return newWeights;
    });
  };

  const handleApplyWeights = () => {
    const totalAllocated = Object.values(tempWeights).reduce((sum, w) => sum + w, 0);

    if (totalAllocated > 1) {
      alert(`Total allocation (${(totalAllocated * 100).toFixed(1)}%) exceeds 100%. Please adjust weights.`);
      return;
    }

    if (includeCash) {
      const applied: Record<string, number> = {};
      Object.keys(tempWeights).forEach((ticker) => {
        applied[ticker] = tempWeights[ticker];
      });
      setPortfolioWeights(applied);
      setCashWeight(Math.max(0, 1 - totalAllocated));
      setAppliedIncludeCash(true);
      return;
    }

    setAppliedIncludeCash(false);
    setCashWeight(0);

    if (totalAllocated <= 0) {
      alert("Please allocate at least some weight to your selected assets.");
      return;
    }

    const applied: Record<string, number> = {};
    if (Math.abs(totalAllocated - 1) < 1e-6) {
      Object.keys(tempWeights).forEach((ticker) => {
        applied[ticker] = tempWeights[ticker];
      });
    } else {
      Object.keys(tempWeights).forEach((ticker) => {
        applied[ticker] = tempWeights[ticker] / totalAllocated;
      });
      alert(
        `Allocated ${(totalAllocated * 100).toFixed(1)}% to equities; scaled to 100% invested for risk metrics.`
      );
    }
    setPortfolioWeights(applied);
  };

  const handleResetWeights = () => {
    if (selectedPortfolioAssets.length === 0) return;
    const equalWeight = 1 / selectedPortfolioAssets.length;
    const newTempWeights: Record<string, number> = {};
    selectedPortfolioAssets.forEach((ticker) => {
      newTempWeights[ticker] = equalWeight;
    });
    setTempWeights(newTempWeights);
  };

  const tempTotal = Object.values(tempWeights).reduce((sum, w) => sum + w, 0);
  const draftCashWeight = includeCash ? Math.max(0, 1 - tempTotal) : 0;
  const hasPendingChanges =
    !weightsMatch(tempWeights, portfolioWeights) ||
    includeCash !== appliedIncludeCash ||
    (appliedIncludeCash && Math.abs(cashWeight - draftCashWeight) > 1e-4);

  const pieWeights = hasPendingChanges ? tempWeights : portfolioWeights;
  const pieCashWeight = hasPendingChanges ? draftCashWeight : cashWeight;
  const pieIncludeCash = hasPendingChanges ? includeCash : appliedIncludeCash;

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#0a0e1a', minHeight: '100vh' }}>
      <header className="border-b border-slate-800 py-4" style={{ borderColor: '#1e293b' }}>
        <div className="container max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-dashboard-accent" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-dashboard-accent to-dashboard-highlight bg-clip-text text-transparent">
                AlphaVision
              </h1>
            </div>
            <p className="text-sm text-slate-400 max-w-md text-right hidden sm:block">
              {TAGLINE}
            </p>
          </div>
        </div>
      </header>

      <ComplianceStrip />

      <main className="container max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="asset-analysis" className="space-y-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Financial Risk Analytics</h2>
              <p className="text-slate-400">
                Analyze individual assets or create portfolio simulations with advanced risk metrics
              </p>
            </div>
            <TabsList className="bg-slate-800">
              <TabsTrigger value="asset-analysis" className="data-[state=active]:bg-dashboard-accent">
                <BarChart className="h-4 w-4 mr-2" />
                Asset Analysis
              </TabsTrigger>
              <TabsTrigger value="portfolio-analysis" className="data-[state=active]:bg-dashboard-accent">
                <TrendingUp className="h-4 w-4 mr-2" />
                Portfolio Analysis
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* Asset Analysis Tab */}
          <TabsContent value="asset-analysis" className="space-y-6">
            <div className="flex justify-end">
              <AssetSelector 
                value={selectedAsset} 
                onChange={handleAssetSelect}
              />
            </div>
            
            <AssetInfoCard ticker={selectedAsset} />
            
            <AssetVaRChart 
              ticker={selectedAsset} 
              days={selectedDays} 
              onDaysChange={setSelectedDays}
            />
            
            <VaRSummaryStatistics 
              ticker={selectedAsset} 
              days={selectedDays}
            />
            
            <AssetChart ticker={selectedAsset} days={selectedDays} />
            
            <AssetNewsHeadlines ticker={selectedAsset} days={selectedDays} />
          </TabsContent>
          
          {/* Portfolio Analysis Tab */}
          <TabsContent value="portfolio-analysis" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <PortfolioAssetSelector
                  selectedAssets={selectedPortfolioAssets}
                  weights={portfolioWeights}
                  tempWeights={tempWeights}
                  includeCash={includeCash}
                  hasPendingChanges={hasPendingChanges}
                  onSelectAsset={handlePortfolioAssetSelect}
                  onWeightChange={handleWeightChange}
                  onIncludeCashChange={setIncludeCash}
                  onApplyWeights={handleApplyWeights}
                  onResetWeights={handleResetWeights}
                />
              </div>
              
              <div className="lg:col-span-2 space-y-6">
                <PortfolioMetricsCard
                  selectedAssets={selectedPortfolioAssets}
                  weights={portfolioWeights}
                  cashWeight={cashWeight}
                />
                
                <PortfolioAllocationChart
                  selectedAssets={selectedPortfolioAssets}
                  weights={pieWeights}
                  includeCash={pieIncludeCash}
                  cashWeight={pieCashWeight}
                  preview={hasPendingChanges}
                />
              </div>
            </div>
            
            <PortfolioVaRChart
              selectedAssets={selectedPortfolioAssets}
              weights={portfolioWeights}
              cashWeight={cashWeight}
              days={portfolioDays}
              onDaysChange={setPortfolioDays}
            />
            
            <PortfolioChart
              selectedAssets={selectedPortfolioAssets}
              weights={portfolioWeights}
              cashWeight={cashWeight}
              days={portfolioDays}
            />
          </TabsContent>
        </Tabs>
      </main>
      
      <SiteFooter />

      <RiskChatbot
        selectedAsset={selectedAsset}
        portfolioAssets={selectedPortfolioAssets}
        portfolioWeights={portfolioWeights}
        cashWeight={cashWeight}
      />
    </div>
  );
};

export default Index;
