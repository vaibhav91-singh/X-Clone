"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft, Bell } from "lucide-react";
import { Button } from "./ui/button";
import TweetCard from "./TweetCard";
import axiosInstance from "@/lib/axiosInstance";
import { containsKeywords } from "@/lib/notifications";
import LoadingSpinner from "./loading-spinner";

export default function NotificationsPage() {
  const [matchingTweets, setMatchingTweets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/post");
      if (res.data && Array.isArray(res.data)) {
        const filtered = res.data.filter((tweet: any) => 
          containsKeywords(tweet.content)
        );
        setMatchingTweets(filtered);
      }
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 bg-background/90 backdrop-blur-md border-b border-border z-10">
        <div className="px-4 py-3 flex items-center space-x-8">
          <h1 className="text-xl font-bold text-foreground">Notifications</h1>
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-border">
        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : matchingTweets.length > 0 ? (
          matchingTweets.map((tweet) => (
            <div key={tweet._id || tweet.id} className="relative">
              <div className="absolute left-4 top-4 text-blue-500">
                <Bell className="h-5 w-5 fill-current" />
              </div>
              <div className="pl-12">
                <div className="p-4 bg-blue-500/5 border-l-4 border-blue-500 mb-2 mx-4 mt-2 rounded">
                   <p className="text-sm text-blue-400 font-semibold">Matched Keyword: "cricket" or "science"</p>
                </div>
                <TweetCard tweet={tweet} />
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center px-4">
            <h3 className="text-2xl font-extrabold text-foreground mb-2">
              Nothing to see here — yet
            </h3>
            <p className="text-muted-foreground max-w-xs mx-auto">
              When someone posts about "cricket" or "science", you'll find those tweets here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
