"use client";

import React, { useEffect, useState } from "react";
import { Search, TrendingUp } from "lucide-react";
import { Input } from "./ui/input";
import TweetCard from "./TweetCard";
import axiosInstance from "@/lib/axiosInstance";
import LoadingSpinner from "./loading-spinner";

export default function ExplorePage({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    try {
      setLoading(true);
      setHasSearched(true);
      const res = await axiosInstance.get(`/search?q=${encodeURIComponent(query)}`);
      setResults(res.data);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      handleSearch();
    }
  }, [initialQuery]);

  return (
    <div className="min-h-screen">
      {/* Search Header */}
      <div className="sticky top-0 bg-background/90 backdrop-blur-md border-b border-border z-10 p-4">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tweets..."
            className="pl-12 bg-secondary border-border text-foreground placeholder-muted-foreground rounded-full py-3 focus:border-blue-500"
          />
        </form>
      </div>

      {/* Content */}
      <div className="divide-y divide-border">
        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : hasSearched ? (
          results.length > 0 ? (
            results.map((tweet) => (
              <TweetCard key={tweet._id || tweet.id} tweet={tweet} />
            ))
          ) : (
            <div className="py-12 text-center px-4">
              <h3 className="text-2xl font-extrabold text-foreground mb-2">
                No results for "{query}"
              </h3>
              <p className="text-muted-foreground">
                Try searching for something else, or check your spelling.
              </p>
            </div>
          )
        ) : (
          <div className="p-4">
            <div className="flex items-center space-x-2 mb-6">
              <TrendingUp className="h-6 w-6 text-blue-500" />
              <h2 className="text-xl font-bold text-foreground">Trends for you</h2>
            </div>
            <div className="space-y-6">
              {[
                { category: "Technology · Trending", title: "#JavaScript", tweets: "125K posts" },
                { category: "Sports · Trending", title: "Cricket World Cup", tweets: "89K posts" },
                { category: "Science · Trending", title: "James Webb Telescope", tweets: "45K posts" },
                { category: "Entertainment · Trending", title: "New Movie Release", tweets: "210K posts" },
              ].map((trend, i) => (
                <div key={i} className="hover:bg-accent cursor-pointer p-2 rounded transition-colors" onClick={() => {
                   setQuery(trend.title);
                   // Trigger search next tick
                   setTimeout(() => handleSearch(), 0);
                }}>
                  <p className="text-xs text-muted-foreground">{trend.category}</p>
                  <p className="text-foreground font-bold">{trend.title}</p>
                  <p className="text-xs text-muted-foreground">{trend.tweets}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
