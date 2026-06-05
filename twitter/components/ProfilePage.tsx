"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Link as LinkIcon,
  MoreHorizontal,
  Camera,
  Settings,
  Bell,
  BellOff,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { requestNotificationPermission } from "@/lib/notifications";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import TweetCard from "./TweetCard";
import { Card, CardContent } from "./ui/card";
import EditProfile from "./EditProfile";
import LoginHistory from "./LoginHistory";
import axiosInstance from "@/lib/axiosInstance";

interface Tweet {
  id: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    verified?: boolean;
  };
  content: string;
  timestamp: string;
  likes: number;
  retweets: number;
  comments: number;
  liked?: boolean;
  retweeted?: boolean;
  image?: string;
}
const tweets: Tweet[] = [
  {
    id: "1",
    author: {
      id: "1",
      username: "elonmusk",
      displayName: "Elon Musk",
      avatar:
        "https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg?auto=compress&cs=tinysrgb&w=400",
      verified: true,
    },
    content:
      "Just had an amazing conversation about the future of AI. The possibilities are endless!",
    timestamp: "2h",
    likes: 1247,
    retweets: 324,
    comments: 89,
    liked: false,
    retweeted: false,
  },
  {
    id: "2",
    author: {
      id: "1",
      username: "sarahtech",
      displayName: "Sarah Johnson",
      avatar:
        "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=400",
      verified: false,
    },
    content:
      "Working on some exciting new features for our app. Can't wait to share what we've been building! 🚀",
    timestamp: "4h",
    likes: 89,
    retweets: 23,
    comments: 12,
    liked: true,
    retweeted: false,
  },
  {
    id: "3",
    author: {
      id: "4",
      username: "designguru",
      displayName: "Alex Chen",
      avatar:
        "https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=400",
      verified: true,
    },
    content:
      "The new design system is finally complete! It took 6 months but the results are incredible. Clean, consistent, and accessible.",
    timestamp: "6h",
    likes: 456,
    retweets: 78,
    comments: 34,
    liked: false,
    retweeted: true,
    image:
      "https://images.pexels.com/photos/196645/pexels-photo-196645.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
];
export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState("posts");
  const [showEditModal, setShowEditModal] = useState(false);
  const [tweetsData, setTweetsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTweets = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/post");
      if (res.data && res.data.length > 0) {
        setTweetsData(res.data);
      } else {
        setTweetsData(tweets); // Fallback to local mock array
      }
    } catch (error) {
      console.warn("Profile fetch failed, using mock data", error);
      setTweetsData(tweets);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTweets();
  }, []);

  if (!user) return null;

  // Filter tweets by current user (handling both id and _id for compatibility)
  const userTweets = tweetsData.filter((t: any) => {
    const authorId = t.author?._id || t.author?.id || t.author;
    return authorId === user.id;
  });

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 bg-background/90 backdrop-blur-md border-b border-border z-10">
        <div className="flex items-center px-4 py-3 space-x-8">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-accent"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground truncate max-w-[200px]">
              {user.displayName}
            </h1>
            <p className="text-sm text-muted-foreground">{userTweets.length} posts</p>
          </div>
        </div>
      </div>

      {/* Cover Photo */}
      <div className="relative">
        <div className="h-48 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 relative group">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 h-9 w-9 rounded-full bg-background/50 hover:bg-background/70 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Camera className="h-5 w-5 text-foreground" />
          </Button>
        </div>

        {/* Profile Picture */}
        <div className="absolute -bottom-16 left-4">
          <div className="relative group">
            <Avatar className="h-32 w-32 border-4 border-background ring-1 ring-border">
              <AvatarImage src={user.avatar} alt={user.displayName} />
              <AvatarFallback className="text-3xl bg-blue-600">
                {user.displayName[0]}
              </AvatarFallback>
            </Avatar>
            <Button
              variant="ghost"
              size="icon"
              className="absolute inset-0 m-auto h-10 w-10 rounded-full bg-background/40 hover:bg-background/60 opacity-0 group-hover:opacity-100 transition-all"
            >
              <Camera className="h-5 w-5 text-foreground" />
            </Button>
          </div>
        </div>

        {/* Edit Profile Button */}
        <div className="flex justify-end p-4">
          <Button
            variant="outline"
            className="border-border text-foreground bg-transparent hover:bg-foreground/10 font-bold rounded-full px-6 transition-all"
            onClick={() => setShowEditModal(true)}
          >
            Edit profile
          </Button>
        </div>
      </div>

      {/* Notification Toggle (Requirement) */}
      <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {user.notificationsEnabled ? (
            <Bell className="h-5 w-5 text-blue-500" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <p className="text-foreground font-semibold">Tweet Notifications</p>
            <p className="text-xs text-muted-foreground">Notify me for "cricket" or "science" tweets</p>
          </div>
        </div>
        <Button
          variant={user.notificationsEnabled ? "default" : "outline"}
          size="sm"
          className={`rounded-full px-4 ${
            user.notificationsEnabled 
              ? "bg-blue-500 hover:bg-blue-600" 
              : "border-border text-foreground hover:bg-foreground/10"
          }`}
          onClick={async () => {
            const newState = !user.notificationsEnabled;
            if (newState) {
              const granted = await requestNotificationPermission();
              if (!granted) {
                alert("Please enable notification permissions in your browser to use this feature.");
                return;
              }
            }
            await updateProfile({ notificationsEnabled: newState });
          }}
        >
          {user.notificationsEnabled ? "Enabled" : "Disabled"}
        </Button>
      </div>

      {/* Profile Info */}
      <div className="px-4 pb-4 mt-12 space-y-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold text-foreground truncate">
              {user.displayName}
            </h1>
            <p className="text-muted-foreground">@{user.username}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-accent h-9 w-9"
          >
            <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>

        {user.bio ? (
          <p className="text-foreground leading-normal whitespace-pre-wrap">{user.bio}</p>
        ) : (
          <p className="text-muted-foreground italic">No bio yet.</p>
        )}

        <div className="flex flex-wrap gap-y-2 gap-x-4 text-muted-foreground text-sm">
          <div className="flex items-center space-x-1">
            <MapPin className="h-4 w-4" />
            <span>{user.location || "Earth"}</span>
          </div>
          <div className="flex items-center space-x-1">
            <LinkIcon className="h-4 w-4" />
            <a href={user.website} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
              {user.website || "example.com"}
            </a>
          </div>
          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4" />
            <span>
              Joined{" "}
              {user.joinDate && !isNaN(new Date(user.joinDate).getTime())
                ? new Date(user.joinDate).toLocaleDateString("en-us", {
                    month: "long",
                    year: "numeric",
                  })
                : "Recently"}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-5 text-sm">
          <div className="flex items-center space-x-1 cursor-pointer hover:underline">
            <span className="font-bold text-foreground">124</span>
            <span className="text-muted-foreground">Following</span>
          </div>
          <div className="flex items-center space-x-1 cursor-pointer hover:underline">
            <span className="font-bold text-foreground">892</span>
            <span className="text-muted-foreground">Followers</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-2">
        <TabsList className="grid w-full grid-cols-5 bg-transparent border-b border-border rounded-none h-auto p-0">
          {["Posts", "Replies", "Media", "Likes", "Security"].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab.toLowerCase()}
              className="data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:border-b-[4px] data-[state=active]:border-blue-500 data-[state=active]:rounded-none text-muted-foreground hover:bg-accent py-4 font-bold transition-all text-sm"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="posts" className="mt-0">
          <div className="divide-y divide-border">
            {loading ? (
              <div className="py-12 flex justify-center">
                <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
              </div>
            ) : userTweets.length > 0 ? (
              userTweets.map((tweet: any) => (
                <TweetCard key={tweet._id || tweet.id} tweet={tweet} />
              ))
            ) : (
              <div className="py-12 text-center px-4">
                <h3 className="text-2xl font-extrabold text-foreground mb-2">
                  @{user.username} hasn't posted yet
                </h3>
                <p className="text-muted-foreground max-w-xs mx-auto">
                  When they do, their posts will show up here.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="security" className="mt-0 p-4">
          <LoginHistory />
        </TabsContent>

        {["replies", "media", "likes"].map((tabValue) => (
          <TabsContent key={tabValue} value={tabValue} className="mt-0">
            <div className="py-12 text-center px-4">
              <h3 className="text-2xl font-extrabold text-foreground mb-2 capitalize">
                No {tabValue} yet
              </h3>
              <p className="text-muted-foreground">
                When there's something to show, it will appear here.
              </p>
            </div>
          </TabsContent>
        ))}
      </Tabs>
      
      <EditProfile
        isopen={showEditModal}
        onclose={() => setShowEditModal(false)}
      />
    </div>
  );
}
