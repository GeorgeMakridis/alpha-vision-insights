// API service layer for AlphaVision backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface Stock {
  ticker: string;
  name: string;
  sector: string;
  price: number;
  marketCap: number;
}

export interface PriceHistoryItem {
  date: string;
  price: number;
  sentiment: number;
  volume: number;
}

export interface NewsItem {
  title: string;
  source: string;
  date: string;
  sentiment: number;
  url: string;
  content?: string; // Add content field
}

export interface RiskMetrics {
  parametricVaR95: number;
  monteCarloVaR95: number;
  deepVaR95: number;
  blnnVaR95: number;
  parametricVaR99: number;
  monteCarloVaR99: number;
  deepVaR99: number;
  blnnVaR99: number;
  sharpeRatio: number;
  volatility: number;
  returns: number;
  maxDrawdown: number;
}

export interface BacktestingStats {
  breachCount: number;
  breachPercentage: number;
  expectedBreaches: number;
  expectedPercentage: number;
  totalDays: number;
}

export interface MetricsResponse {
  metrics: RiskMetrics;
  backtesting?: {
    parametricVaR95?: BacktestingStats;
    monteCarloVaR95?: BacktestingStats;
    deepVaR95?: BacktestingStats;
    parametricVaR99?: BacktestingStats;
    monteCarloVaR99?: BacktestingStats;
    deepVaR99?: BacktestingStats;
  };
  rolling_window?: number;
}

export interface PortfolioMetrics {
  parametricVaR95: number;
  monteCarloVaR95: number;
  deepVaR95: number;
  parametricVaR99: number;
  monteCarloVaR99: number;
  deepVaR99: number;
  returns: number;
  volatility: number;
  sharpeRatio: number;
}

export interface MarketSummary {
  totalStocks: number;
  marketDate: string;
  averagePrice: number;
  totalVolume: number;
  marketSentiment: number;
}

export interface LimeWord {
  word: string;
  limeValue: number;
  importance: number; // 0-1 scale
}

export interface LimeAnalysis {
  title: string;
  content: string;
  limeWords: LimeWord[];
  overallSentiment: number;
  aiInsights?: string; // Add AI insights field
}

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.detail || errorMessage;
        } catch {
          // If error text is not JSON, use the text or default message
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      // Re-throw with more context if it's not already an Error
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`API request failed for ${endpoint}: ${String(error)}`);
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request('/health');
  }

  // Get all available stocks
  async getStocks(): Promise<{ stocks: Stock[] }> {
    return this.request('/api/stocks');
  }

  // Get price history for a specific stock
  async getStockPriceHistory(
    ticker: string,
    days: number = 30
  ): Promise<{ priceHistory: PriceHistoryItem[] }> {
    return this.request(`/api/stocks/${ticker}/price-history?days=${days}`);
  }

  // Get news headlines for a specific stock
  async getStockNews(
    ticker: string,
    limit: number = 10
  ): Promise<{ news: NewsItem[] }> {
    return this.request(`/api/stocks/${ticker}/news?limit=${limit}`);
  }

  // Get risk metrics for a specific stock
  async getStockMetrics(ticker: string, days?: number, rollingWindow?: number): Promise<MetricsResponse> {
    const params = new URLSearchParams();
    if (days) {
      params.append('days', days.toString());
    }
    if (rollingWindow) {
      params.append('rolling_window', rollingWindow.toString());
    }
    const queryString = params.toString();
    return this.request(`/api/stocks/${ticker}/metrics${queryString ? `?${queryString}` : ''}`);
  }

  // Get time-series VaR data for plotting
  async getVarTimeSeries(ticker: string, days?: number, rollingWindow?: number): Promise<{
    timeseries: Array<{
      date: string;
      price: number;
      parametricVaR95: number;
      monteCarloVaR95: number;
      parametricVaR99: number;
      monteCarloVaR99: number;
      deepVaR95: number;
      blnnVaR95: number;
      deepVaR99: number;
      blnnVaR99: number;
      parametricVaR95Price: number;
      monteCarloVaR95Price: number;
      parametricVaR99Price: number;
      monteCarloVaR99Price: number;
      deepVaR95Price: number;
      blnnVaR95Price: number;
      deepVaR99Price: number;
      blnnVaR99Price: number;
    }>;
    rolling_window: number;
  }> {
    const params = new URLSearchParams();
    if (days) {
      params.append('days', days.toString());
    }
    if (rollingWindow) {
      params.append('rolling_window', rollingWindow.toString());
    }
    const queryString = params.toString();
    return this.request(`/api/stocks/${ticker}/var-timeseries${queryString ? `?${queryString}` : ''}`);
  }

  // Get portfolio metrics
  async getPortfolioMetrics(selectedAssets: string[], weights: Record<string, number>): Promise<MetricsResponse> {
    return this.request('/api/portfolio/metrics', {
      method: 'POST',
      body: JSON.stringify({
        selected_assets: selectedAssets,
        weights: weights
      })
    });
  }

  // Get portfolio price history
  async getPortfolioPriceHistory(selectedAssets: string[], weights: Record<string, number>, days: number = 30): Promise<{ priceHistory: any[] }> {
    return this.request('/api/portfolio/price-history', {
      method: 'POST',
      body: JSON.stringify({
        selected_assets: selectedAssets,
        weights: weights,
        days: days
      })
    });
  }

  // Get portfolio time-series VaR data
  async getPortfolioVarTimeSeries(
    selectedAssets: string[], 
    weights: Record<string, number>, 
    days?: number, 
    rollingWindow?: number
  ): Promise<VaRTimeSeriesResponse> {
    return this.request('/api/portfolio/var-timeseries', {
      method: 'POST',
      body: JSON.stringify({
        selected_assets: selectedAssets,
        weights: weights,
        days: days,
        rolling_window: rollingWindow
      })
    });
  }

  // Get market summary
  async getMarketSummary(): Promise<MarketSummary> {
    return this.request('/api/market/summary');
  }

  // Get LIME analysis for a news article
  async getLimeAnalysis(articleId: string): Promise<LimeAnalysis> {
    return this.request(`/api/news/${articleId}/lime-analysis`);
  }
}

// Create singleton instance
export const apiService = new ApiService();

// Custom hooks for React Query integration
export const apiHooks = {
  useStocks: () => ({
    queryKey: ['stocks'],
    queryFn: () => apiService.getStocks(),
  }),

  useStockPriceHistory: (ticker: string, days: number = 30) => ({
    queryKey: ['stock-price-history', ticker, days],
    queryFn: () => apiService.getStockPriceHistory(ticker, days),
    enabled: !!ticker,
  }),

  useStockNews: (ticker: string, limit: number = 10) => ({
    queryKey: ['stock-news', ticker, limit],
    queryFn: () => apiService.getStockNews(ticker, limit),
    enabled: !!ticker,
  }),

  useStockMetrics: (ticker: string) => ({
    queryKey: ['stock-metrics', ticker],
    queryFn: () => apiService.getStockMetrics(ticker),
    enabled: !!ticker,
  }),

  usePortfolioMetrics: (selectedAssets: string[], weights: Record<string, number>) => ({
    queryKey: ['portfolio-metrics', selectedAssets, weights],
    queryFn: () => apiService.getPortfolioMetrics(selectedAssets, weights),
    enabled: selectedAssets.length > 0,
  }),

  usePortfolioPriceHistory: (
    selectedAssets: string[],
    weights: Record<string, number>,
    days: number = 30
  ) => ({
    queryKey: ['portfolio-price-history', selectedAssets, weights, days],
    queryFn: () => apiService.getPortfolioPriceHistory(selectedAssets, weights, days),
    enabled: selectedAssets.length > 0,
  }),

  useMarketSummary: () => ({
    queryKey: ['market-summary'],
    queryFn: () => apiService.getMarketSummary(),
  }),
}; 