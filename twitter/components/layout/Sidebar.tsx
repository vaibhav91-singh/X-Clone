"use client";

import React from 'react';

import {
  Home,
  Search,
  Bell,
  Mail,
  Bookmark,
  User,
  MoreHorizontal,
  Settings,
  LogOut,
  Crown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import TwitterLogo from '../Twitterlogo';
import LanguageSelector from '../LanguageSelector';
import { useAuth } from '@/context/AuthContext';
import { ThemeToggle } from '../theme-toggle';

interface SidebarProps {
  currentPage?: string;
  onNavigate?: (page: string) => void;
  notificationCount?: number;
}

export default function Sidebar({ currentPage = 'home', onNavigate, notificationCount = 0 }: SidebarProps) {
  const { user, logout } = useAuth();

  const navigation = [
    { name: 'Home', icon: Home, current: currentPage === 'home', page: 'home' },
    { name: 'Explore', icon: Search, current: currentPage === 'explore', page: 'explore' },
    { name: 'Notifications', icon: Bell, current: currentPage === 'notifications', page: 'notifications', badge: true },
    { name: 'Messages', icon: Mail, current: currentPage === 'messages', page: 'messages' },
    { name: 'Bookmarks', icon: Bookmark, current: currentPage === 'bookmarks', page: 'bookmarks' },
    { name: 'Profile', icon: User, current: currentPage === 'profile', page: 'profile' },
    { name: 'Premium', icon: Crown, current: currentPage === 'subscription', page: 'subscription' },
    { name: 'More', icon: MoreHorizontal, current: currentPage === 'more', page: 'more' },
  ];

  return (
    <div className="flex flex-col h-screen w-64 border-r border-border bg-background">
      <div className="p-4 flex items-center justify-between">
        <TwitterLogo size="lg" className="text-foreground" />
        <div className="flex items-center gap-2">
          <LanguageSelector />
          <ThemeToggle />
        </div>
      </div>
      
      <nav className="flex-1 px-2">
        <ul className="space-y-2">
          {navigation.map((item) => (
            <li key={item.name}>
              <Button
                variant="ghost"
                className={`w-full justify-start text-xl py-6 px-4 rounded-full hover:bg-accent ${
                  item.current ? 'font-bold' : 'font-normal'
                } text-foreground hover:text-foreground`}
                onClick={() => onNavigate?.(item.page)}
              >
                <item.icon className="mr-4 h-7 w-7" />
                {item.name}
                {item.badge && notificationCount > 0 && (
                  <span className="ml-2 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </Button>
            </li>
          ))}
        </ul>
        
        <div className="mt-8 px-2">
          <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-full text-lg">
            Post
          </Button>
        </div>
      </nav>
      
      {user && (
        <div className="p-4 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start p-3 rounded-full hover:bg-accent"
              >
                <Avatar className="h-10 w-10 mr-3">
                  <AvatarImage src={user.avatar} alt={user.displayName} />
                  <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <div className="text-foreground font-semibold">{user.displayName}</div>
                  <div className="text-muted-foreground text-sm">@{user.username}</div>
                </div>
                <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-background border-border">
              <DropdownMenuItem className="text-foreground hover:bg-accent">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem 
                className="text-foreground hover:bg-accent"
                onClick={logout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out @{user.username}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
