"use client";
import { useAuth } from "@/context/AuthContext";
import { NavigationProvider } from "@/context/NavigationContext";
import React, { useState } from "react";
import LoadingSpinner from "../loading-spinner";
import Sidebar from "./Sidebar";
import RightSidebar from "./RightSidebar";
import ProfilePage from "../ProfilePage";
import NotificationsPage from "../NotificationsPage";
import ExplorePage from "../ExplorePage";
import SubscriptionPage from "../SubscriptionPage";

const Mainlayout = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState("home");
  const [notificationCount, setNotificationCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const handleNavigate = (page: string, query?: string) => {
    setCurrentPage(page);
    if (query) setSearchQuery(query);
    if (page === "notifications") markNotificationsAsRead();
  };

  const markNotificationsAsRead = () => {
    localStorage.setItem("lastViewedNotifications", new Date().toISOString());
    setNotificationCount(0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-foreground text-4xl font-bold mb-4">X</div>
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <>{children}</>;
  }

  return (
    <NavigationProvider navigate={handleNavigate}>
    <div className="min-h-screen bg-background text-foreground flex justify-center">
      <div className="w-20 sm:w-24 md:w-64 border-r border-border">
        <Sidebar
          currentPage={currentPage}
          onNavigate={handleNavigate}
          notificationCount={notificationCount}
        />
      </div>
      <main className="flex-1 max-w-2xl border-x border-border">
        {currentPage === "profile" ? (
          <ProfilePage />
        ) : currentPage === "notifications" ? (
          <NotificationsPage />
        ) : currentPage === "explore" ? (
          <ExplorePage initialQuery={searchQuery} />
        ) : currentPage === "subscription" ? (
          <SubscriptionPage />
        ) : (
          children
        )}
      </main>
      <div className="hidden lg:block w-80 p-4">
        <RightSidebar onSearch={(q) => handleNavigate("explore", q)} onNavigate={handleNavigate} />
      </div>
    </div>
    </NavigationProvider>
  );
};

export default Mainlayout;
