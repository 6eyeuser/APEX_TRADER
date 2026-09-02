"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Newspaper, Clock, ExternalLink, Activity, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Article {
  id: number | string;
  headline: string;
  summary: string;
  author?: string;
  created_at?: string;
  url?: string;
  images?: { size?: string; url: string }[];
  symbols?: string[];
}

function NewsContent() {
  const searchParams = useSearchParams();
  const headlineParam = searchParams.get("headline");
  const sourceParam = searchParams.get("source");
  const summaryParam = searchParams.get("summary");
  const urlParam = searchParams.get("url"); 

  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchNews = async () => {
      try {
        let res = await fetch("/api/auth/news");
        if (!res.ok) {
          res = await fetch("/api/news");
        }

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("News API route not found. Ensure app/api/auth/news/route.ts exists.");
        }

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setArticles(data.articles || []);
      } catch (err: any) {
        setError(err.message || "Failed to load news");
      } finally {
        setIsLoading(false);
      }
    };

    fetchNews();
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white p-6 md:p-12 font-sans">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8 flex items-center justify-between border-b border-[#1E222D] pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Newspaper size={32} className="text-[#2962FF]" />
            <h1 className="text-3xl font-bold text-white tracking-tight">Market News</h1>
          </div>
          <p className="text-gray-400 text-sm">Live financial headlines and analysis.</p>
        </div>
        <Link 
          href="/terminal" 
          className="flex items-center gap-2 bg-[#131722] hover:bg-[#1E222D] border border-[#1E222D] text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <Activity size={18} className="text-[#2962FF]" />
          <span>Back to Terminal</span>
        </Link>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Featured / Selected Story */}
        {headlineParam && (
          <div className="bg-[#131722] border border-[#2962FF]/40 rounded-2xl p-6 md:p-8 relative shadow-[0_0_30px_rgba(41,98,255,0.1)]">
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase bg-[#2962FF]/20 text-[#2962FF] px-2.5 py-1 rounded-md">
                  Selected Story
                </span>
                {sourceParam && (
                  <span className="text-xs text-gray-400 font-medium">Source: {sourceParam}</span>
                )}
              </div>
              <Link 
                href="/news" 
                className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={16} /> Back to Feed
              </Link>
            </div>
            
            {/* Added text-white for visibility */}
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-snug">
              {headlineParam}
            </h2>
            
            {summaryParam && (
              <p className="text-gray-300 text-base md:text-lg leading-relaxed mb-6">
                {summaryParam}
              </p>
            )}
            
            {/* Added Read Article Button */}
            {urlParam ? (
              <a 
                href={urlParam}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#2962FF] hover:bg-[#1e4ad8] text-white px-6 py-3 rounded-xl font-medium transition-colors"
              >
                Read Full Article <ExternalLink size={18} />
              </a>
            ) : (
              <p className="text-sm text-gray-500 italic">External link not provided for this story.</p>
            )}
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <div className="w-8 h-8 border-4 border-[#1E222D] border-t-[#2962FF] rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Fetching latest market headlines...</p>
          </div>
        )}

        {/* Error Notification */}
        {error && !isLoading && (
          <div className="flex items-center gap-3 bg-[#FF3B30]/10 border border-[#FF3B30]/40 text-[#FF3B30] p-4 rounded-xl text-sm">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        )}

        {/* Articles Feed Grid */}
        {!isLoading && articles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <a
                key={article.id}
                href={article.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col bg-[#131722] border border-[#1E222D] hover:border-[#2962FF]/50 rounded-2xl overflow-hidden transition-all hover:shadow-[0_0_20px_rgba(41,98,255,0.15)]"
              >
                {article.images && article.images[0]?.url && (
                  <div className="w-full h-44 overflow-hidden bg-[#1A1E29]">
                    <img
                      src={article.images[0].url}
                      alt="News preview"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}

                <div className="p-5 flex flex-col flex-grow">
                  {article.symbols && article.symbols.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {article.symbols.slice(0, 3).map((sym) => (
                        <span
                          key={sym}
                          className="text-[11px] font-bold bg-[#2962FF]/20 text-[#2962FF] px-2 py-0.5 rounded"
                        >
                          {sym}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Fixed Header Contrast */}
                  <h3 className="font-bold text-lg text-white mb-2 group-hover:text-[#2962FF] transition-colors line-clamp-2">
                    {article.headline}
                  </h3>

                  {/* Fixed Paragraph Contrast */}
                  <p className="text-gray-400 text-sm leading-relaxed mb-4 line-clamp-3 flex-grow">
                    {article.summary}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-gray-500 pt-3 border-t border-[#1E222D] mt-auto">
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} />
                      <span>
                        {article.created_at
                          ? new Date(article.created_at).toLocaleDateString()
                          : "Live"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 group-hover:text-[#2962FF] transition-colors font-medium">
                      <span>Read Article</span>
                      <ExternalLink size={12} />
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function NewsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0B0E14]" />}>
      <NewsContent />
    </Suspense>
  );
}