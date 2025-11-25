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
import { apiService } from "@/services/api";
import { BarChart, TrendingUp, Info } from "lucide-react";

const Index = () => {
  // Asset Analysis state
  const [selectedAsset, setSelectedAsset] = useState<string>("AAPL");
  const [selectedDays, setSelectedDays] = useState<number>(60); // Default period for charts and backtesting
  
  // Portfolio Analysis state
  const [selectedPortfolioAssets, setSelectedPortfolioAssets] = useState<string[]>([]);
  const [portfolioWeights, setPortfolioWeights] = useState<Record<string, number>>({});
  const [portfolioDays, setPortfolioDays] = useState<number>(60); // Default period for portfolio charts
  const [tempWeights, setTempWeights] = useState<Record<string, number>>({}); // Temporary weights before submission
  const [includeCash, setIncludeCash] = useState<boolean>(false); // Whether to include cash option
  
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
      
      // Redistribute weights equally
      const newWeights: Record<string, number> = {};
      newPortfolioAssets.forEach(asset => {
        newWeights[asset] = 1 / newPortfolioAssets.length;
      });
      setPortfolioWeights(newWeights);
    }
  };
  
  // Handle portfolio asset selection
  const handlePortfolioAssetSelect = (ticker: string, selected: boolean) => {
    if (selected) {
      // Add the asset to the portfolio
      setSelectedPortfolioAssets(prev => {
        const newAssets = [...prev, ticker];
        
        // Update temp weights with equal distribution
        setTempWeights(prevWeights => {
          const newWeights = { ...prevWeights };
          const equalWeight = 1 / newAssets.length;
          newAssets.forEach(t => {
            newWeights[t] = equalWeight;
          });
          return newWeights;
        });
        
        // Also update applied weights
        setPortfolioWeights(prevWeights => {
          const newWeights = { ...prevWeights };
          const equalWeight = 1 / newAssets.length;
          newAssets.forEach(t => {
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
        setTempWeights(prevWeights => {
          const newWeights = { ...prevWeights };
          delete newWeights[ticker];
          
          if (newAssets.length > 0) {
            // Redistribute to equal weights
            const equalWeight = 1 / newAssets.length;
            newAssets.forEach(t => {
              newWeights[t] = equalWeight;
            });
          }
          
          return newWeights;
        });
        
        // Also update applied weights
        setPortfolioWeights(prevWeights => {
          const newWeights = { ...prevWeights };
          delete newWeights[ticker];
          
          if (newAssets.length > 0) {
            // Redistribute to equal weights
            const equalWeight = 1 / newAssets.length;
            newAssets.forEach(t => {
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

  // Apply weights (normalize and submit)
  const handleApplyWeights = () => {
    const totalAllocated = Object.values(tempWeights).reduce((sum, w) => sum + w, 0);
    
    if (totalAllocated > 1) {
      alert(`Total allocation (${(totalAllocated * 100).toFixed(1)}%) exceeds 100%. Please adjust weights.`);
      return;
    }

    // Normalize weights to sum to 1
    // If cash is included and total < 1, we normalize assets to their proportion
    // If cash is not included, we normalize to sum to 1
    const normalizedWeights: Record<string, number> = {};
    const assetTotal = totalAllocated;
    
    if (assetTotal > 0) {
      // Normalize asset weights to sum to 1 (cash is handled separately in display)
      Object.keys(tempWeights).forEach(ticker => {
        normalizedWeights[ticker] = tempWeights[ticker] / assetTotal;
      });
    }
    
    setPortfolioWeights(normalizedWeights);
  };

  // Reset weights to equal distribution
  const handleResetWeights = () => {
    const equalWeight = 1 / selectedPortfolioAssets.length;
    const newTempWeights: Record<string, number> = {};
    selectedPortfolioAssets.forEach(ticker => {
      newTempWeights[ticker] = equalWeight;
    });
    setTempWeights(newTempWeights);
    setPortfolioWeights(newTempWeights);
  };

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
            
            <AssetChart ticker={selectedAsset} />
            
            <AssetNewsHeadlines ticker={selectedAsset} />
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
                />
                
                <PortfolioAllocationChart
                  selectedAssets={selectedPortfolioAssets}
                  weights={portfolioWeights}
                />
              </div>
            </div>
            
            <PortfolioVaRChart
              selectedAssets={selectedPortfolioAssets}
              weights={portfolioWeights}
              days={portfolioDays}
              onDaysChange={setPortfolioDays}
            />
            
            <PortfolioChart
              selectedAssets={selectedPortfolioAssets}
              weights={portfolioWeights}
              days={portfolioDays}
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
              Real-time data from S&P 100 stocks
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
