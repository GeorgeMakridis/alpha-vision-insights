import { useState, useRef, useEffect, useCallback } from "react";
import { apiService } from "@/services/api";
import { MessageSquare, X, Send, Bot, User, Loader2, Trash2 } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface RiskChatbotProps {
  selectedAsset?: string;
  portfolioAssets?: string[];
  portfolioWeights?: Record<string, number>;
}

export default function RiskChatbot({
  selectedAsset,
  portfolioAssets,
  portfolioWeights,
}: RiskChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setError(null);
    setIsLoading(true);

    try {
      const history = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const result = await apiService.chat(
        trimmed,
        selectedAsset,
        portfolioAssets,
        portfolioWeights,
        history
      );

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.response },
      ]);
    } catch (err: any) {
      const errorMsg =
        err?.message?.includes("503") || err?.message?.includes("API key")
          ? "OpenAI API key not configured. Set OPENAI_API_KEY in the backend."
          : "Failed to get a response. Please try again.";
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  // Simple markdown-lite renderer for assistant messages
  const renderContent = (text: string) => {
    // Split by code blocks first
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const code = part.slice(3, -3).replace(/^\w+\n/, "");
        return (
          <pre
            key={i}
            className="bg-black/30 rounded px-3 py-2 my-2 text-xs overflow-x-auto font-mono text-slate-300"
          >
            {code}
          </pre>
        );
      }
      // Bold
      const formatted = part.split(/(\*\*[^*]+\*\*)/g).map((seg, j) => {
        if (seg.startsWith("**") && seg.endsWith("**")) {
          return (
            <strong key={j} className="text-white font-semibold">
              {seg.slice(2, -2)}
            </strong>
          );
        }
        return seg;
      });
      return <span key={i}>{formatted}</span>;
    });
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg shadow-purple-900/30 transition-all duration-300 hover:scale-105 hover:shadow-purple-800/40 active:scale-95"
          style={{
            background: "linear-gradient(135deg, #9b87f5 0%, #7c3aed 100%)",
          }}
        >
          <MessageSquare className="h-5 w-5 text-white" />
          <span className="text-white text-sm font-medium">Risk Analyst</span>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div
          className="fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl border border-slate-700/80 shadow-2xl shadow-black/50 overflow-hidden"
          style={{
            width: "min(420px, calc(100vw - 48px))",
            height: "min(600px, calc(100vh - 100px))",
            background: "linear-gradient(180deg, #131726 0%, #0d1117 100%)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(155,135,245,0.15) 0%, rgba(124,58,237,0.08) 100%)",
              borderBottom: "1px solid rgba(148,163,184,0.1)",
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="flex items-center justify-center w-8 h-8 rounded-lg"
                style={{
                  background:
                    "linear-gradient(135deg, #9b87f5 0%, #7c3aed 100%)",
                }}
              >
                <Bot className="h-4.5 w-4.5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white leading-tight">
                  AlphaVision Risk Analyst
                </h3>
                <p className="text-[11px] text-slate-400 leading-tight">
                  RAG-powered • S&P 100 data
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
                  title="Clear chat"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8 opacity-80">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(155,135,245,0.2) 0%, rgba(124,58,237,0.1) 100%)",
                    border: "1px solid rgba(155,135,245,0.15)",
                  }}
                >
                  <Bot className="h-6 w-6 text-dashboard-accent" />
                </div>
                <p className="text-sm text-slate-300 font-medium mb-2">
                  Financial Risk Assistant
                </p>
                <p className="text-xs text-slate-500 leading-relaxed max-w-[280px]">
                  Ask me about VaR metrics, portfolio risk, stock analysis, or
                  news sentiment. I have access to your dashboard data in
                  real-time.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
                  {[
                    `What's the risk profile of ${selectedAsset || "AAPL"}?`,
                    "Explain my portfolio VaR",
                    "Which stocks have highest volatility?",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setInput(suggestion);
                        inputRef.current?.focus();
                      }}
                      className="text-[11px] px-2.5 py-1.5 rounded-lg border text-slate-400 hover:text-slate-200 hover:border-dashboard-accent/40 transition-colors"
                      style={{
                        borderColor: "rgba(148,163,184,0.15)",
                        background: "rgba(255,255,255,0.02)",
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      background:
                        "linear-gradient(135deg, #9b87f5 0%, #7c3aed 100%)",
                    }}
                  >
                    <Bot className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-dashboard-accent/20 text-slate-100 border border-dashboard-accent/20"
                      : "text-slate-300"
                  }`}
                  style={
                    msg.role === "assistant"
                      ? {
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(148,163,184,0.08)",
                        }
                      : undefined
                  }
                >
                  {msg.role === "assistant"
                    ? renderContent(msg.content)
                    : msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 bg-slate-700/60">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 justify-start">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    background:
                      "linear-gradient(135deg, #9b87f5 0%, #7c3aed 100%)",
                  }}
                >
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
                <div
                  className="rounded-xl px-3 py-2.5 flex items-center gap-2"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(148,163,184,0.08)",
                  }}
                >
                  <Loader2 className="h-3.5 w-3.5 text-dashboard-accent animate-spin" />
                  <span className="text-xs text-slate-500">Analyzing...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="mx-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div
            className="shrink-0 px-3 pb-3 pt-2"
            style={{
              borderTop: "1px solid rgba(148,163,184,0.08)",
            }}
          >
            <div
              className="flex items-end gap-2 rounded-xl px-3 py-2"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(148,163,184,0.12)",
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about risk, VaR, portfolio..."
                rows={1}
                className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 resize-none outline-none max-h-[80px] leading-relaxed"
                style={{ minHeight: "24px" }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "24px";
                  target.style.height = target.scrollHeight + "px";
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="p-1.5 rounded-lg transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-dashboard-accent/20"
                style={{
                  color: input.trim() ? "#9b87f5" : undefined,
                }}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[10px] text-slate-600 text-center mt-1.5">
              Powered by OpenAI • Grounded in your dashboard data
            </p>
          </div>
        </div>
      )}
    </>
  );
}
