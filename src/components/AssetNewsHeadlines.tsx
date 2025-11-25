import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/services/api";
import { CardGradient } from "@/components/ui/card-gradient";
import { CalendarDays, ExternalLink, Newspaper, Brain } from "lucide-react";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import LimeWordHighlight from "./LimeWordHighlight";
import { LimeAnalysis } from "@/services/api";

interface AssetNewsHeadlinesProps {
  ticker: string;
}

interface NewsItem {
  title: string;
  source: string;
  date: string;
  sentiment: number;
  url: string;
  content?: string; // Add content field
  id?: string; // Add ID for LIME analysis
}

export default function AssetNewsHeadlines({ ticker }: AssetNewsHeadlinesProps) {
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);
  const [limeAnalysis, setLimeAnalysis] = useState<LimeAnalysis | null>(null);
  const [isLimeLoading, setIsLimeLoading] = useState(false);

  // Fetch news data from API
  const { data: newsData, isLoading, error } = useQuery({
    queryKey: ['stock-news', ticker, 10],
    queryFn: () => apiService.getStockNews(ticker, 10),
    enabled: !!ticker,
  });
  
  const newsItems = newsData?.news || [];
  
  const getSentimentClass = (sentiment: number) => {
    if (sentiment > 0.3) return "text-dashboard-positive";
    if (sentiment < -0.3) return "text-dashboard-negative";
    return "text-slate-400";
  };

  // Function to generate a unique article ID from URL or title
  const generateArticleId = (article: NewsItem): string => {
    // Use URL if available, otherwise use title hash
    if (article.url) {
      // Extract a unique identifier from the URL
      const urlParts = article.url.split('/');
      const lastPart = urlParts[urlParts.length - 1];
      if (lastPart && lastPart.length > 0) {
        return lastPart.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
      }
    }
    // Fallback: create a hash from title and date
    const hash = article.title + article.date;
    return hash.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
  };

  // Function to handle LIME analysis
  const handleLimeAnalysis = async (article: NewsItem) => {
    setSelectedArticle(article);
    setIsLimeLoading(true);

    try {
      // Generate article ID
      const articleId = generateArticleId(article);
      
      // Call the actual API endpoint
      const analysis = await apiService.getLimeAnalysis(articleId);
      setLimeAnalysis(analysis);
    } catch (error) {
      console.error('Failed to load XAI analysis:', error);
      // Show error to user - you could add a toast notification here
      alert('Failed to load XAI analysis. Please try again.');
    } finally {
      setIsLimeLoading(false);
    }
  };

  const closeLimeAnalysis = () => {
    setSelectedArticle(null);
    setLimeAnalysis(null);
  };
  
  if (isLoading) {
    return (
      <CardGradient className="h-[400px] flex items-center justify-center">
        <p className="text-muted-foreground">Loading news for {ticker}...</p>
      </CardGradient>
    );
  }
  
  if (error) {
    return (
      <CardGradient className="h-[400px] flex items-center justify-center">
        <p className="text-dashboard-negative">
          Error loading news: {error.message || 'Unknown error'}
        </p>
      </CardGradient>
    );
  }
  
  if (newsItems.length === 0) {
    return (
      <CardGradient className="h-[400px] flex items-center justify-center">
        <p className="text-muted-foreground">No news available for {ticker}</p>
      </CardGradient>
    );
  }
  
  return (
    <>
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
                <TableHead className="w-[100px]">Analysis</TableHead>
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
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLimeAnalysis(item)}
                      disabled={isLimeLoading}
                      className="flex items-center gap-1"
                    >
                      <Brain className="h-3 w-3" />
                      {isLimeLoading ? 'Loading...' : 'XAI'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardGradient>

      {/* LIME Analysis Popup */}
      {limeAnalysis && selectedArticle && (
        <LimeWordHighlight
          title={limeAnalysis.title}
          content={limeAnalysis.content}
          limeWords={limeAnalysis.limeWords}
          overallSentiment={limeAnalysis.overallSentiment}
          aiInsights={limeAnalysis.aiInsights}
          isOpen={true}
          onClose={closeLimeAnalysis}
        />
      )}
    </>
  );
}
