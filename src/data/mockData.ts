
// Mock data for S&P 100 stocks
export interface Stock {
  ticker: string;
  name: string;
  sector: string;
  price: number;
  marketCap: number;
  priceHistory: { date: string; price: number; sentiment: number; volume: number }[];
  metrics: {
    parametricVaR95: number;
    monteCarloVaR95: number;
    deepVaR95: number;
    parametricVaR99: number;
    monteCarloVaR99: number;
    deepVaR99: number;
    sharpeRatio: number;
    volatility: number;
    returns: number;
    maxDrawdown: number;
  };
}

// Generate random price history data
const generatePriceHistory = (days: number, basePrice: number) => {
  const today = new Date();
  const data = [];
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Generate random price change (-3% to +3%)
    const changePercent = (Math.random() * 6 - 3) / 100;
    const price = basePrice * (1 + changePercent);
    basePrice = price; // Update base price for next iteration
    
    // Random sentiment score between -1 and 1
    const sentiment = Math.round((Math.random() * 2 - 1) * 100) / 100;
    
    // Random volume (10k to 100k)
    const volume = Math.floor(Math.random() * 90000) + 10000;
    
    data.push({
      date: date.toISOString().split('T')[0],
      price: Math.round(price * 100) / 100,
      sentiment,
      volume
    });
  }
  
  return data;
};

// Generate random metrics
const generateMetrics = () => {
  return {
    parametricVaR95: Math.round(Math.random() * 300 + 100) / 100,
    monteCarloVaR95: Math.round(Math.random() * 300 + 100) / 100,
    deepVaR95: Math.round(Math.random() * 300 + 100) / 100,
    parametricVaR99: Math.round(Math.random() * 500 + 200) / 100,
    monteCarloVaR99: Math.round(Math.random() * 500 + 200) / 100,
    deepVaR99: Math.round(Math.random() * 500 + 200) / 100,
    sharpeRatio: Math.round(Math.random() * 300) / 100,
    volatility: Math.round(Math.random() * 2000 + 500) / 100,
    returns: Math.round((Math.random() * 40 - 10) * 100) / 100,
    maxDrawdown: -Math.round(Math.random() * 3000 + 1000) / 100
  };
};

// Mock S&P 100 stocks
export const mockStocks: Stock[] = [
  {
    ticker: "AAPL",
    name: "Apple Inc.",
    sector: "Technology",
    price: 185.92,
    marketCap: 2900000000000,
    priceHistory: generatePriceHistory(90, 185.92),
    metrics: generateMetrics()
  },
  {
    ticker: "MSFT",
    name: "Microsoft Corporation",
    sector: "Technology",
    price: 425.52,
    marketCap: 3150000000000,
    priceHistory: generatePriceHistory(90, 425.52),
    metrics: generateMetrics()
  },
  {
    ticker: "GOOGL",
    name: "Alphabet Inc.",
    sector: "Technology",
    price: 164.30,
    marketCap: 2100000000000,
    priceHistory: generatePriceHistory(90, 164.30),
    metrics: generateMetrics()
  },
  {
    ticker: "AMZN",
    name: "Amazon.com Inc.",
    sector: "Consumer Discretionary",
    price: 178.15,
    marketCap: 1850000000000,
    priceHistory: generatePriceHistory(90, 178.15),
    metrics: generateMetrics()
  },
  {
    ticker: "META",
    name: "Meta Platforms Inc.",
    sector: "Communication Services",
    price: 474.36,
    marketCap: 1200000000000,
    priceHistory: generatePriceHistory(90, 474.36),
    metrics: generateMetrics()
  },
  {
    ticker: "TSLA",
    name: "Tesla Inc.",
    sector: "Consumer Discretionary",
    price: 177.58,
    marketCap: 560000000000,
    priceHistory: generatePriceHistory(90, 177.58),
    metrics: generateMetrics()
  },
  {
    ticker: "BRK.B",
    name: "Berkshire Hathaway Inc.",
    sector: "Financials",
    price: 416.86,
    marketCap: 910000000000,
    priceHistory: generatePriceHistory(90, 416.86),
    metrics: generateMetrics()
  },
  {
    ticker: "NVDA",
    name: "NVIDIA Corporation",
    sector: "Technology",
    price: 879.90,
    marketCap: 2160000000000,
    priceHistory: generatePriceHistory(90, 879.90),
    metrics: generateMetrics()
  },
  {
    ticker: "JPM",
    name: "JPMorgan Chase & Co.",
    sector: "Financials",
    price: 198.48,
    marketCap: 570000000000,
    priceHistory: generatePriceHistory(90, 198.48),
    metrics: generateMetrics()
  },
  {
    ticker: "JNJ",
    name: "Johnson & Johnson",
    sector: "Healthcare",
    price: 152.32,
    marketCap: 365000000000,
    priceHistory: generatePriceHistory(90, 152.32),
    metrics: generateMetrics()
  }
];

// Calculate portfolio metrics
export const calculatePortfolioMetrics = (
  selectedStocks: string[],
  weights: Record<string, number>
) => {
  // Filter selected stocks
  const stocks = mockStocks.filter(stock => selectedStocks.includes(stock.ticker));
  
  // Normalize weights if they don't sum to 1
  const weightSum = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  const normalizedWeights = { ...weights };
  
  if (weightSum !== 1) {
    Object.keys(normalizedWeights).forEach(ticker => {
      normalizedWeights[ticker] = normalizedWeights[ticker] / weightSum;
    });
  }
  
  // Calculate portfolio metrics
  const portfolioMetrics = {
    parametricVaR95: 0,
    monteCarloVaR95: 0,
    deepVaR95: 0,
    parametricVaR99: 0,
    monteCarloVaR99: 0,
    deepVaR99: 0,
    returns: 0,
    volatility: 0,
    sharpeRatio: 0
  };
  
  // Calculate weighted metrics
  stocks.forEach(stock => {
    const weight = normalizedWeights[stock.ticker] || 0;
    
    portfolioMetrics.parametricVaR95 += stock.metrics.parametricVaR95 * weight;
    portfolioMetrics.monteCarloVaR95 += stock.metrics.monteCarloVaR95 * weight;
    portfolioMetrics.deepVaR95 += stock.metrics.deepVaR95 * weight;
    portfolioMetrics.parametricVaR99 += stock.metrics.parametricVaR99 * weight;
    portfolioMetrics.monteCarloVaR99 += stock.metrics.monteCarloVaR99 * weight;
    portfolioMetrics.deepVaR99 += stock.metrics.deepVaR99 * weight;
    portfolioMetrics.returns += stock.metrics.returns * weight;
    portfolioMetrics.volatility += stock.metrics.volatility * weight;
  });
  
  // Calculate portfolio Sharpe Ratio (simplified)
  const riskFreeRate = 2.0; // Assuming 2% risk-free rate
  portfolioMetrics.sharpeRatio = 
    portfolioMetrics.volatility !== 0 
      ? (portfolioMetrics.returns - riskFreeRate) / portfolioMetrics.volatility 
      : 0;
  
  // Round values for display
  Object.keys(portfolioMetrics).forEach(key => {
    portfolioMetrics[key as keyof typeof portfolioMetrics] = 
      Math.round(portfolioMetrics[key as keyof typeof portfolioMetrics] * 100) / 100;
  });
  
  return portfolioMetrics;
};

// Calculate portfolio price history
export const calculatePortfolioPriceHistory = (
  selectedStocks: string[],
  weights: Record<string, number>
) => {
  if (selectedStocks.length === 0) return [];
  
  // Filter selected stocks
  const stocks = mockStocks.filter(stock => selectedStocks.includes(stock.ticker));
  if (stocks.length === 0) return [];
  
  // Normalize weights if they don't sum to 1
  const weightSum = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  const normalizedWeights = { ...weights };
  
  if (weightSum !== 1) {
    Object.keys(normalizedWeights).forEach(ticker => {
      normalizedWeights[ticker] = normalizedWeights[ticker] / weightSum;
    });
  }
  
  // Use the first stock's dates as reference
  const result = [...stocks[0].priceHistory].map(dayData => ({
    date: dayData.date,
    price: 0,
    sentiment: 0,
    volume: 0
  }));
  
  // Calculate weighted price, sentiment, and volume for each day
  result.forEach((day, i) => {
    stocks.forEach(stock => {
      const weight = normalizedWeights[stock.ticker] || 0;
      const stockDay = stock.priceHistory[i];
      
      day.price += stockDay.price * weight;
      day.sentiment += stockDay.sentiment * weight;
      day.volume += stockDay.volume * weight;
    });
    
    // Round values
    day.price = Math.round(day.price * 100) / 100;
    day.sentiment = Math.round(day.sentiment * 100) / 100;
    day.volume = Math.round(day.volume);
  });
  
  return result;
};

// Format market cap to human-readable format
export const formatMarketCap = (marketCap: number): string => {
  if (marketCap >= 1000000000000) {
    return `$${(marketCap / 1000000000000).toFixed(2)}T`;
  }
  if (marketCap >= 1000000000) {
    return `$${(marketCap / 1000000000).toFixed(2)}B`;
  }
  if (marketCap >= 1000000) {
    return `$${(marketCap / 1000000).toFixed(2)}M`;
  }
  return `$${(marketCap / 1000).toFixed(2)}K`;
};

// Format price with currency symbol
export const formatPrice = (price: number): string => {
  return `$${price.toFixed(2)}`;
};

// Format percentage
export const formatPercent = (value: number): string => {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
};
