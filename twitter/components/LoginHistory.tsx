"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import axiosInstance from "@/lib/axiosInstance";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  Chrome, 
  Globe, 
  MapPin, 
  Clock, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Trash2,
} from "lucide-react";
import LoadingSpinner from "./loading-spinner";

interface LoginRecord {
  _id: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  device: string;
  ipAddress: string;
  loginTime: string;
  loginStatus: string;
  failureReason?: string;
  requiresOTP: boolean;
  otpVerified: boolean;
}

export default function LoginHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<LoginRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email) {
      loadHistory();
    }
  }, [user]);

  const loadHistory = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axiosInstance.get(`/auth/login-history/${user?.email}`);
      setHistory(response.data.history || []);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load login history");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (historyId: string) => {
    if (!confirm("Are you sure you want to delete this login record?")) return;

    setDeleteLoading(historyId);
    try {
      await axiosInstance.delete(`/auth/login-history/${historyId}`, {
        data: { email: user?.email },
      });
      setHistory(prev => prev.filter(record => record._id !== historyId));
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to delete record");
    } finally {
      setDeleteLoading(null);
    }
  };

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case "mobile":
        return <Smartphone className="h-5 w-5" />;
      case "tablet":
        return <Tablet className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "blocked":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "failed":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-900/30 text-green-400 border border-green-800">Success</span>;
      case "blocked":
        return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-900/30 text-red-400 border border-red-800">Blocked</span>;
      case "failed":
        return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-900/30 text-yellow-400 border border-yellow-800">Failed</span>;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  if (loading) {
    return (
      <Card className="bg-background border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            Login History
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-background border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            Login History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-400">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-background border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            Login History
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={loadHistory}
            className="text-xs"
          >
            Refresh
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          View your recent login activities and device information
        </p>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No login history available
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((record) => (
              <div
                key={record._id}
                className="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header with status and time */}
                    <div className="flex items-center gap-2 mb-3">
                      {getStatusIcon(record.loginStatus)}
                      {getStatusBadge(record.loginStatus)}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(record.loginTime)}
                      </span>
                    </div>

                    {/* Device and Browser Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        {getDeviceIcon(record.device)}
                        <div>
                          <div className="font-medium text-foreground">
                            {record.device.charAt(0).toUpperCase() + record.device.slice(1)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {record.os} {record.osVersion && `${record.osVersion}`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-foreground">
                            {record.browser}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {record.browserVersion && `v${record.browserVersion}`}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* IP Address */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <MapPin className="h-3 w-3" />
                      <span>IP: {record.ipAddress}</span>
                    </div>

                    {/* OTP Info */}
                    {record.requiresOTP && (
                      <div className="flex items-center gap-2 text-xs">
                        <Shield className="h-3 w-3 text-blue-500" />
                        <span className="text-blue-400">
                          OTP Required {record.otpVerified && "✓ Verified"}
                        </span>
                      </div>
                    )}

                    {/* Failure Reason */}
                    {record.failureReason && (
                      <div className="mt-2 bg-red-900/20 border border-red-800 rounded p-2 text-xs text-red-400">
                        <AlertTriangle className="h-3 w-3 inline mr-1" />
                        {record.failureReason}
                      </div>
                    )}
                  </div>

                  {/* Delete Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(record._id)}
                    disabled={deleteLoading === record._id}
                    className="text-muted-foreground hover:text-red-400"
                  >
                    {deleteLoading === record._id ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
