
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import AssetSelector from "@/components/AssetSelector";
import AssetInfoCard from "@/components/AssetInfoCard";
import AssetChart from "@/components/AssetChart";
import VaRMetricsCard from "@/components/VaRMetricsCard";
import MetricsSummaryCard from "@/components/MetricsSummaryCard";
import PortfolioAssetSelector from "@/components/PortfolioAssetSelector";
import PortfolioMetricsCard from "@/components/PortfolioMetricsCard";
import PortfolioAllocationChart from "@/components/PortfolioAllocationChart";
import PortfolioChart from "@/components/PortfolioChart";
import { mockStocks } from "@/data/mockData";
import { BarChart, TrendingUp, Info } from "lucide-react";

const Index = () => {
  // Asset Analysis state
  const [selectedAsset, setSelectedAsset] = useState<string>("AAPL");
  
  // Portfolio Analysis state
  const [selectedPortfolioAssets, setSelectedPortfolioAssets] = useState<string[]>([]);
  const [portfolioWeights, setPortfolioWeights] = useState<Record<string, number>>({});
  
  // Initialize with some default portfolio assets
  useEffect(() => {
    const defaultAssets = ["AAPL", "MSFT", "GOOGL"];
    setSelectedPortfolioAssets(defaultAssets);
    
    // Set equal weights initially
    const initialWeights: Record<string, number> = {};
    defaultAssets.forEach(ticker => {
      initialWeights[ticker] = 1 / defaultAssets.length;
    });
    setPortfolioWeights(initialWeights);
  }, []);
  
  // Handle portfolio asset selection
  const handlePortfolioAssetSelect = (ticker: string, selected: boolean) => {
    if (selected) {
      // Add the asset to the portfolio
      setSelectedPortfolioAssets(prev => [...prev, ticker]);
      
      // Initialize with equal weight distribution
      setPortfolioWeights(prev => {
        const newWeights = { ...prev };
        const newCount = selectedPortfolioAssets.length + 1;
        
        // Adjust all weights to be equal
        [...selectedPortfolioAssets, ticker].forEach(t => {
          newWeights[t] = 1 / newCount;
        });
        
        return newWeights;
      });
    } else {
      // Remove the asset from the portfolio
      setSelectedPortfolioAssets(prev => prev.filter(t => t !== ticker));
      
      // Redistribute weights
      setPortfolioWeights(prev => {
        const newWeights = { ...prev };
        delete newWeights[ticker];
        
        const remainingAssets = selectedPortfolioAssets.filter(t => t !== ticker);
        if (remainingAssets.length > 0) {
          // Redistribute to equal weights
          remainingAssets.forEach(t => {
            newWeights[t] = 1 / remainingAssets.length;
          });
        }
        
        return newWeights;
      });
    }
  };
  
  // Handle portfolio weight change
  const handleWeightChange = (ticker: string, weight: number) => {
    setPortfolioWeights(prev => {
      // Get total of other weights
      const otherWeightsTotal = Object.entries(prev)
        .filter(([t]) => t !== ticker)
        .reduce((sum, [, w]) => sum + w, 0);
      
      // Enforce sum to 1 by adjusting other weights proportionally
      const newWeights = { ...prev, [ticker]: weight };
      
      if (otherWeightsTotal > 0) {
        const scaleFactor = (1 - weight) / otherWeightsTotal;
        
        Object.keys(newWeights).forEach(t => {
          if (t !== ticker) {
            newWeights[t] = prev[t] * scaleFactor;
          }
        });
      }
      
      return newWeights;
    });
  };

  return (
    <div className="min-h-screen bg-dashboard-bg text-white">
      <header className="border-b border-slate-800 py-4">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-dashboard-accent" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-dashboard-accent to-dashboard-highlight bg-clip-text text-transparent">
                AlphaVision
              </h1>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <div className="flex items-center gap-1">
                <Info className="h-4 w-4" />
                <span className="text-sm">Financial Analysis Dashboard</span>
              </div>
            </div>
          </div>
        </div>
      </header>

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
              <AssetSelector value={selectedAsset} onChange={setSelectedAsset} />
            </div>
            
            <AssetInfoCard ticker={selectedAsset} />
            
            <AssetChart ticker={selectedAsset} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <VaRMetricsCard ticker={selectedAsset} />
              <MetricsSummaryCard ticker={selectedAsset} />
            </div>
          </TabsContent>
          
          {/* Portfolio Analysis Tab */}
          <TabsContent value="portfolio-analysis" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <PortfolioAssetSelector
                  selectedAssets={selectedPortfolioAssets}
                  weights={portfolioWeights}
                  onSelectAsset={handlePortfolioAssetSelect}
                  onWeightChange={handleWeightChange}
                />
              </div>
              
              <div className="lg:col-span-2 space-y-6">
                <PortfolioMetricsCard
                  selectedAssets={selectedPortfolioAssets}
                  weights={portfolioWeights}
                />
                
                <PortfolioAllocationChart
                  selectedAssets={selectedPortfolioAssets}
                  weights={portfolioWeights}
                />
              </div>
            </div>
            
            <PortfolioChart
              selectedAssets={selectedPortfolioAssets}
              weights={portfolioWeights}
            />
          </TabsContent>
        </Tabs>
      </main>
      
      <footer className="border-t border-slate-800 py-4 mt-8">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-400">
              AlphaVision Dashboard | Financial Risk Analytics Platform
            </p>
            <p className="text-sm text-slate-500">
              Data is simulated for demonstration purposes
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
