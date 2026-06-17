import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/services/api";
import { CardGradient } from "@/components/ui/card-gradient";
import { CalendarDays, ExternalLink, Newspaper, Brain } from "lucide-react";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import LimeWordHighlight from "./LimeWordHighlight";
import ModelBadge from "@/components/legal/ModelBadge";
import { LimeAnalysis, NewsItem } from "@/services/api";

interface AssetNewsHeadlinesProps {
  ticker: string;
  days?: number;
}

function resolveArticleId(article: NewsItem): string {
  if (article.article_id) {
    return article.article_id;
  }
  if (article.url) {
    const urlParts = article.url.split("/");
    const lastPart = urlParts[urlParts.length - 1];
    if (lastPart && lastPart.length > 0) {
      return lastPart.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 50);
    }
  }
  const hash = article.title + article.date;
  return hash.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 50);
}

export default function AssetNewsHeadlines({
  ticker,
  days = 60,
}: AssetNewsHeadlinesProps) {
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);
  const [limeAnalysis, setLimeAnalysis] = useState<LimeAnalysis | null>(null);
  const [isLimeLoading, setIsLimeLoading] = useState(false);

  const { data: meta } = useQuery({
    queryKey: ["meta"],
    queryFn: () => apiService.getMeta(),
  });

  const { data: newsData, isLoading, error } = useQuery({
    queryKey: ["stock-news", ticker, 10, days],
    queryFn: () => apiService.getStockNews(ticker, 10, days),
    enabled: !!ticker,
  });

  const newsItems = newsData?.news || [];
  const xaiConfigured = meta?.xai_api_configured === true;
  const xaiButtonLabel = xaiConfigured ? "XAI explanation" : "XAI";

  const getSentimentClass = (sentiment: number) => {
    if (sentiment > 0.3) return "text-dashboard-positive";
    if (sentiment < -0.3) return "text-dashboard-negative";
    return "text-slate-400";
  };

  const handleLimeAnalysis = async (article: NewsItem) => {
    setSelectedArticle(article);
    setIsLimeLoading(true);

    try {
      const articleId = resolveArticleId(article);
      const analysis = await apiService.getLimeAnalysis(articleId, article.url);
      setLimeAnalysis(analysis);
    } catch (err) {
      console.error("Failed to load XAI analysis:", err);
      alert(
        xaiConfigured
          ? "Failed to load XAI explanation from the external service. Please try again."
          : "XAI service is not configured. Set XAI_API_URL on the backend or XAI_USE_MOCK=true for local dev."
      );
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
          Error loading news: {error.message || "Unknown error"}
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
        <div className="flex justify-between items-start mb-4 gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-lg font-medium">Recent News Headlines</h3>
              <ModelBadge kind="newsSentiment" />
              <ModelBadge kind="lime" />
            </div>
            <p className="text-xs text-slate-500">
              Sentiment from FinBERT at ingest. XAI explanations are fetched on demand
              {xaiConfigured ? " from the configured external service." : " when XAI_API_URL is set."}
            </p>
          </div>
          <span className="text-sm text-muted-foreground shrink-0">
            {newsItems.length} articles · {days}-day lookback · {ticker}
          </span>
        </div>

        <div className="overflow-hidden rounded-md border border-slate-800">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-slate-800">
                <TableHead className="w-[50%]">Headline</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[90px]">Sentiment</TableHead>
                <TableHead className="w-[100px]">Analysis</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {newsItems.map((item, index) => (
                <TableRow
                  key={item.article_id ?? index}
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
                            Sentiment:{" "}
                            <span className={getSentimentClass(item.sentiment)}>
                              {item.sentiment > 0
                                ? "Positive"
                                : item.sentiment < 0
                                  ? "Negative"
                                  : "Neutral"}
                            </span>
                            <span className="ml-1 text-slate-500">
                              (
                              {typeof item.sentiment === "number"
                                ? item.sentiment.toFixed(3)
                                : item.sentiment}
                              )
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
                    <span className={getSentimentClass(item.sentiment)}>
                      {typeof item.sentiment === "number"
                        ? item.sentiment.toFixed(3)
                        : String(item.sentiment ?? 0)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLimeAnalysis(item)}
                      disabled={isLimeLoading}
                      className="flex items-center gap-1"
                      title={
                        xaiConfigured
                          ? "Fetch word-level explanation from external XAI service"
                          : "Requires XAI_API_URL on backend"
                      }
                    >
                      <Brain className="h-3 w-3" />
                      {isLimeLoading ? "Loading..." : xaiButtonLabel}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardGradient>

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
