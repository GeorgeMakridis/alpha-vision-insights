import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface LimeWord {
  word: string;
  limeValue: number;
  importance: number; // 0-1 scale
}

interface LimeAnalysisProps {
  title: string;
  content: string;
  limeWords: LimeWord[];
  overallSentiment: number;
  aiInsights?: string; // Add AI insights
  isOpen: boolean;
  onClose: () => void;
}

export default function LimeWordHighlight({
  title,
  content,
  limeWords,
  overallSentiment,
  aiInsights,
  isOpen,
  onClose
}: LimeAnalysisProps) {
  if (!isOpen) return null;

  // Create a map of words to their LIME values for quick lookup
  const wordLimeMap = new Map<string, LimeWord>();
  limeWords.forEach(word => {
    wordLimeMap.set(word.word.toLowerCase(), word);
  });

  // Function to get color based on LIME value
  const getWordColor = (limeValue: number, importance: number) => {
    const opacity = Math.min(importance * 2, 1); // Scale importance to opacity
    
    if (limeValue > 0) {
      // Positive sentiment - green shades
      const intensity = Math.min(Math.abs(limeValue) * 255, 255);
      return `rgba(34, 197, 94, ${opacity})`; // Green with opacity
    } else if (limeValue < 0) {
      // Negative sentiment - red shades
      const intensity = Math.min(Math.abs(limeValue) * 255, 255);
      return `rgba(239, 68, 68, ${opacity})`; // Red with opacity
    } else {
      // Neutral - gray
      return `rgba(156, 163, 175, ${opacity})`; // Gray with opacity
    }
  };

  // Function to get sentiment icon
  const getSentimentIcon = (sentiment: number) => {
    if (sentiment > 0.1) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (sentiment < -0.1) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  // Function to get sentiment label
  const getSentimentLabel = (sentiment: number) => {
    if (sentiment > 0.3) return 'Very Positive';
    if (sentiment > 0.1) return 'Positive';
    if (sentiment > -0.1) return 'Neutral';
    if (sentiment > -0.3) return 'Negative';
    return 'Very Negative';
  };

  // Function to render title with highlighted words
  const renderHighlightedTitle = () => {
    const words = title.split(/\s+/);
    
    return words.map((word, index) => {
      const cleanWord = word.replace(/[^\w]/g, '').toLowerCase();
      const limeWord = wordLimeMap.get(cleanWord);
      
      if (limeWord) {
        const color = getWordColor(limeWord.limeValue, limeWord.importance);
        return (
          <span
            key={index}
            style={{
              backgroundColor: color,
              padding: '2px 4px',
              borderRadius: '4px',
              margin: '0 1px',
              fontWeight: limeWord.importance > 0.5 ? 'bold' : 'normal',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            title={`XAI: ${limeWord.limeValue.toFixed(2)}, Importance: ${(limeWord.importance * 100).toFixed(2)}%`}
            className="hover:scale-105"
          >
            {word}
          </span>
        );
      }
      
      return <span key={index}>{word} </span>;
    });
  };

  // Function to render content with highlighted words
  const renderHighlightedContent = () => {
    const words = content.split(/\s+/);
    
    return words.map((word, index) => {
      const cleanWord = word.replace(/[^\w]/g, '').toLowerCase();
      const limeWord = wordLimeMap.get(cleanWord);
      
      if (limeWord) {
        const color = getWordColor(limeWord.limeValue, limeWord.importance);
        return (
          <span
            key={index}
            style={{
              backgroundColor: color,
              padding: '2px 4px',
              borderRadius: '4px',
              margin: '0 1px',
              fontWeight: limeWord.importance > 0.5 ? 'bold' : 'normal',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            title={`XAI: ${limeWord.limeValue.toFixed(2)}, Importance: ${(limeWord.importance * 100).toFixed(2)}%`}
            className="hover:scale-105"
          >
            {word}
          </span>
        );
      }
      
      return <span key={index}>{word} </span>;
    });
  };

  // Function to render content without highlighting (since content is mock)
  const renderPlainContent = () => {
    return <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg text-sm leading-relaxed">{content}</div>;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">XAI Sentiment Analysis</CardTitle>
            <Badge variant="outline" className="flex items-center gap-1">
              {getSentimentIcon(overallSentiment)}
              {getSentimentLabel(overallSentiment)}
            </Badge>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </CardHeader>
        
        <CardContent className="space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Article Title */}
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-2">Article Title</h3>
            <div className="text-lg font-medium leading-relaxed">
              {renderHighlightedTitle()}
            </div>
          </div>

          {/* Highlighted Content */}
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-2">Content Analysis</h3>
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg text-sm leading-relaxed max-h-[40vh] overflow-y-auto">
              {renderHighlightedContent()}
            </div>
          </div>

          {/* Legend */}
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-2">Legend</h3>
            <div className="flex flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Positive Impact</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>Negative Impact</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-gray-500 rounded"></div>
                <span>Neutral Impact</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-bold">Bold</span>
                <span>= High Importance</span>
              </div>
            </div>
          </div>

          {/* Top Influential Words */}
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-2">Top Influential Words</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {limeWords
                .sort((a, b) => Math.abs(b.limeValue) - Math.abs(a.limeValue))
                .slice(0, 9)
                .map((word, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded border"
                    style={{
                      backgroundColor: getWordColor(word.limeValue, word.importance)
                    }}
                  >
                    <span className="font-medium">{word.word}</span>
                    <span className="text-xs">
                      {word.limeValue > 0 ? '+' : ''}{word.limeValue.toFixed(2)}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* AI-Generated Insights */}
          {aiInsights && (
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">AI-Generated Insights</h3>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-2 mb-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="text-sm leading-relaxed">
                    {aiInsights.split('\n').map((line, index) => (
                      <p key={index} className="mb-2 last:mb-0">
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 