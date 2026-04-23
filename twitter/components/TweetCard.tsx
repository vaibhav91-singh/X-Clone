"use client";

import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import {
  Heart,
  MessageCircle,
  Repeat2,
  Share,
  MoreHorizontal,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import axiosInstance from "@/lib/axiosInstance";

export default function TweetCard({ tweet }: any) {
  const { user } = useAuth();
  const [tweetstate, settweetstate] = useState(tweet);

  const likeTweet = async (tweetId: string) => {
    try {
      const authorId = user?.id || user?._id;
      if (!authorId) return;

      const res = await axiosInstance.post(`/like/${tweetId}`, {
        userId: authorId,
      });
      
      const updatedTweet = { ...res.data, id: res.data._id };
      settweetstate(updatedTweet);
    } catch (error) {
      console.warn("Local like toggle fallback", error);
      settweetstate((prev: any) => ({
        ...prev,
        likes: isLiked ? prev.likes - 1 : prev.likes + 1,
        liked: !isLiked
      }));
    }
  };

  const retweetTweet = async (tweetId: string) => {
    try {
      const authorId = user?.id || user?._id;
      if (!authorId) return;

      const res = await axiosInstance.post(`/retweet/${tweetId}`, {
        userId: authorId,
      });
      
      const updatedTweet = { ...res.data, id: res.data._id };
      settweetstate(updatedTweet);
    } catch (error) {
      console.warn("Local retweet toggle fallback", error);
      settweetstate((prev: any) => ({
        ...prev,
        retweets: isRetweet ? prev.retweets - 1 : prev.retweets + 1,
        retweeted: !isRetweet
      }));
    }
  };


  const formatNumber = (num: number) => {
    if (!num) return "0";
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  const formatDate = (timestamp: string) => {
    if (!timestamp) return "";
    if (timestamp === "just now") return "just now";
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return timestamp; // Return raw string if invalid
      return date.toLocaleDateString("en-us", {
        month: "short",
        day: "numeric",
      });
    } catch (e) {
      return timestamp;
    }
  };

  const isLiked = tweetstate.liked || tweetstate.likedBy?.includes(user?.id);
  const isRetweet = tweetstate.retweeted || tweetstate.retweetedBy?.includes(user?.id);
  const tweetId = tweetstate._id || tweetstate.id;

  return (
    <Card className="bg-black border-gray-800 border-x-0 border-t-0 rounded-none hover:bg-gray-950/50 transition-colors cursor-pointer group/card">
      <CardContent className="p-4">
        <div className="flex space-x-3">
          <Avatar className="h-12 w-12 border border-gray-800">
            <AvatarImage
              src={tweetstate.author.avatar}
              alt={tweetstate.author.displayName}
            />
            <AvatarFallback>{tweetstate.author.displayName?.[0]}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-bold text-white hover:underline truncate">
                {tweetstate.author.displayName}
              </span>
              {tweetstate.author.verified && (
                <div className="bg-blue-500 rounded-full p-0.5 flex-shrink-0">
                  <svg
                    className="h-3 w-3 text-white fill-current"
                    viewBox="0 0 20 20"
                  >
                    <path d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                  </svg>
                </div>
              )}
              <span className="text-gray-500 truncate">
                @{tweetstate.author.username}
              </span>
              <span className="text-gray-500 flex-shrink-0">·</span>
              <span className="text-gray-500 flex-shrink-0 whitespace-nowrap">
                {formatDate(tweetstate.timestamp)}
              </span>
              <div className="ml-auto flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-blue-500/10 hover:text-blue-400"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="text-white mb-3 leading-normal whitespace-pre-wrap break-words">
              {tweetstate.content}
            </div>

            {tweetstate.image && (
              <div className="mb-3 rounded-2xl overflow-hidden border border-gray-800">
                <img
                  src={tweetstate.image}
                  alt="Tweet image"
                  className="w-full h-auto max-h-[512px] object-cover hover:opacity-95 transition-opacity"
                />
              </div>
            )}

            <div className="flex items-center justify-between text-gray-500 max-w-md">
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center space-x-2 h-9 px-3 rounded-full hover:bg-blue-500/10 hover:text-blue-400 transition-colors group"
              >
                <MessageCircle className="h-4.5 w-4.5 group-hover:scale-110 transition-transform" />
                <span className="text-xs">
                  {formatNumber(tweetstate.comments)}
                </span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className={`flex items-center space-x-2 h-9 px-3 rounded-full hover:bg-green-500/10 hover:text-green-500 transition-colors group ${
                  isRetweet ? "text-green-500" : ""
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  retweetTweet(tweetId);
                }}
              >
                <Repeat2 className={`h-4.5 w-4.5 group-hover:scale-110 transition-transform ${isRetweet ? "text-green-500" : ""}`} />
                <span className="text-xs">
                  {formatNumber(tweetstate.retweets)}
                </span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className={`flex items-center space-x-2 h-9 px-3 rounded-full hover:bg-red-500/10 hover:text-red-500 transition-colors group ${
                  isLiked ? "text-red-500" : ""
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  likeTweet(tweetId);
                }}
              >
                <Heart
                  className={`h-4.5 w-4.5 group-hover:scale-110 transition-transform ${
                    isLiked ? "fill-red-500 text-red-500" : ""
                  }`}
                />
                <span className="text-xs">
                  {formatNumber(tweetstate.likes)}
                </span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="flex items-center justify-center h-9 w-9 rounded-full hover:bg-blue-500/10 hover:text-blue-400 transition-colors"
              >
                <Share className="h-4.5 w-4.5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}