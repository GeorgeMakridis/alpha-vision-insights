
import { useState, useEffect } from "react";
import { CardGradient } from "@/components/ui/card-gradient";
import { mockStocks } from "@/data/mockData";
import { CalendarDays, ExternalLink, Newspaper } from "lucide-react";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface AssetNewsHeadlinesProps {
  ticker: string;
}

interface NewsItem {
  title: string;
  source: string;
  date: string;
  sentiment: number;
  url: string;
}

export default function AssetNewsHeadlines({ ticker }: AssetNewsHeadlinesProps) {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  
  useEffect(() => {
    // For a real app, this would fetch from an API
    // For this demo, we'll generate mock data based on the ticker
    const generateMockNews = () => {
      const stock = mockStocks.find(s => s.ticker === ticker);
      if (!stock) return [];
      
      // Use priceHistory dates for realistic timeline
      const dates = stock.priceHistory.slice(-10).map(item => item.date);
      
      const sources = [
        "Financial Times", "Bloomberg", "Reuters", "CNBC", 
        "Wall Street Journal", "MarketWatch", "Barron's", "Investor's Business Daily"
      ];
      
      const headlines = [
        `${stock.name} Reports Strong Quarterly Earnings`,
        `Analysts Upgrade ${stock.ticker} Rating to "Buy"`,
        `${stock.ticker} Announces New ${stock.sector} Initiative`,
        `${stock.name} Expands into New Markets`,
        `${stock.name} CEO Discusses Future Growth Strategy`,
        `${stock.ticker} Stock Rallies on Positive Sector News`,
        `${stock.name} Partners with Industry Leader`,
        `${stock.ticker} Introduces New Product Line`,
        `Institutional Investors Increase Stake in ${stock.ticker}`,
        `${stock.name} Addresses Challenges in ${stock.sector} Sector`
      ];
      
      // Generate 10 news items
      return dates.map((date, index) => {
        const randomSentiment = (Math.random() * 2 - 1) * 0.75; // Between -0.75 and 0.75
        return {
          title: headlines[index],
          source: sources[Math.floor(Math.random() * sources.length)],
          date,
          sentiment: randomSentiment,
          url: "#" // In a real app, this would be a real URL
        };
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort by date descending
    };
    
    setNewsItems(generateMockNews());
  }, [ticker]);
  
  const getSentimentClass = (sentiment: number) => {
    if (sentiment > 0.3) return "text-dashboard-positive";
    if (sentiment < -0.3) return "text-dashboard-negative";
    return "text-slate-400";
  };
  
  if (newsItems.length === 0) {
    return (
      <CardGradient className="h-[400px] flex items-center justify-center">
        <p className="text-muted-foreground">No news available for {ticker}</p>
      </CardGradient>
    );
  }
  
  return (
    <CardGradient>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Recent News Headlines</h3>
        <span className="text-sm text-muted-foreground">{newsItems.length} articles related to {ticker}</span>
      </div>
      
      <div className="overflow-hidden rounded-md border border-slate-800">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-slate-800">
              <TableHead className="w-[60%]">Headline</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {newsItems.map((item, index) => (
              <TableRow 
                key={index} 
                className={`hover:bg-slate-800 ${getSentimentClass(item.sentiment)} hover:bg-opacity-50`}
              >
                <TableCell className="font-medium">
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-start gap-2 w-full text-left">
                      <span className="flex-1">{item.title}</span>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <div className="flex justify-between items-center border-t border-slate-700 mt-2 pt-2">
                        <span className="text-xs text-slate-400">
                          Sentiment: <span className={getSentimentClass(item.sentiment)}>
                            {item.sentiment > 0 ? "Positive" : item.sentiment < 0 ? "Negative" : "Neutral"}
                          </span>
                        </span>
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-xs flex items-center gap-1 text-slate-400 hover:text-dashboard-accent"
                        >
                          Read full article <ExternalLink size={12} />
                        </a>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Newspaper className="h-3 w-3 text-slate-400" />
                    <span>{item.source}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3 text-slate-400" />
                    <span>{item.date}</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </CardGradient>
  );
}
