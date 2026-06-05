"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Crown, Check, X, Clock, Zap, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import axiosInstance from "@/lib/axiosInstance";
import { useAuth } from "@/context/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Plan {
  id: string;
  name: string;
  price: number;       // paise
  tweetLimit: number;  // -1 = unlimited
  label: string;
}

interface Subscription {
  plan: string;
  tweetLimit: number;
  tweetsPostedThisMonth: number;
  status: string;
  endDate: string;
  invoiceNumber?: string;
}

// ─── Razorpay type shim ───────────────────────────────────────────────────────
declare global {
  interface Window {
    Razorpay: any;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getISTHour(): number {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(now.getTime() + istOffset).getUTCHours();
}

function isPaymentWindowOpen(): boolean {
  const h = getISTHour();
  return h >= 10 && h < 11;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const PLAN_COLORS: Record<string, string> = {
  free:   "border-gray-600 bg-gray-900/40",
  bronze: "border-amber-600 bg-amber-900/20",
  silver: "border-slate-400 bg-slate-900/20",
  gold:   "border-yellow-400 bg-yellow-900/20",
};

const PLAN_BADGE: Record<string, string> = {
  free:   "bg-gray-700 text-gray-300",
  bronze: "bg-amber-700 text-amber-100",
  silver: "bg-slate-600 text-slate-100",
  gold:   "bg-yellow-600 text-yellow-100",
};

const PLAN_FEATURES: Record<string, string[]> = {
  free:   ["1 tweet per month", "Basic access", "Standard feed"],
  bronze: ["3 tweets per month", "Priority feed", "Bronze badge"],
  silver: ["5 tweets per month", "Priority feed", "Silver badge", "Analytics"],
  gold:   ["Unlimited tweets", "Priority feed", "Gold badge", "Analytics", "Early access"],
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function SubscriptionPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [windowOpen, setWindowOpen] = useState(isPaymentWindowOpen());
  const [istHour, setIstHour] = useState(getISTHour());

  // Update payment-window status every 30 s
  useEffect(() => {
    const interval = setInterval(() => {
      setWindowOpen(isPaymentWindowOpen());
      setIstHour(getISTHour());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch plans + current subscription
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [plansRes, subRes] = await Promise.all([
        axiosInstance.get("/subscription/plans"),
        user?.email
          ? axiosInstance.get(`/subscription/status?email=${encodeURIComponent(user.email)}`)
          : Promise.resolve({ data: null }),
      ]);
      setPlans(plansRes.data);
      setSubscription(subRes.data);
    } catch (err) {
      console.error("Failed to load subscription data", err);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubscribe = async (plan: Plan) => {
    if (!user) return alert("Please log in first.");
    if (plan.id === "free") return alert("You are already on the free plan.");
    if (!windowOpen) {
      return alert(
        `💳 Payments are only allowed between 10:00 AM – 11:00 AM IST.\n\nCurrent IST hour: ${istHour}:xx`
      );
    }

    try {
      setProcessingPlan(plan.id);

      // 1 – Load Razorpay SDK
      const loaded = await loadRazorpayScript();
      if (!loaded) return alert("Failed to load Razorpay. Check your internet connection.");

      // 2 – Create order on backend
      const orderRes = await axiosInstance.post("/subscription/create-order", {
        plan: plan.id,
        userId: user.id,
        email: user.email,
      });

      const { orderId, amount, currency, keyId } = orderRes.data;

      // 3 – Open Razorpay checkout
      const rzp = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        order_id: orderId,
        name: "X Clone",
        description: `${plan.name} Plan – ${plan.label}`,
        image: "/favicon.ico",
        prefill: {
          name: user.displayName,
          email: user.email,
        },
        theme: { color: "#1d9bf0" },
        handler: async (response: any) => {
          try {
            // 4 – Verify payment on backend
            const verifyRes = await axiosInstance.post("/subscription/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: plan.id,
              userId: user.id,
              email: user.email,
            });

            alert(
              `🎉 Payment successful!\n\nPlan: ${plan.name}\nInvoice: ${verifyRes.data.invoiceNumber}\n\nAn invoice has been sent to your email.`
            );
            await fetchData(); // Refresh subscription state
          } catch (err: any) {
            alert("Payment verification failed: " + (err.response?.data?.error || err.message));
          }
        },
        modal: {
          ondismiss: () => setProcessingPlan(null),
        },
      });

      rzp.open();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message;
      alert("Error: " + msg);
    } finally {
      setProcessingPlan(null);
    }
  };

  const tweetsLeft =
    subscription && subscription.tweetLimit !== -1
      ? subscription.tweetLimit - subscription.tweetsPostedThisMonth
      : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 bg-background/90 backdrop-blur-md border-b border-border z-10 px-4 py-3">
        <h1 className="text-xl font-bold flex items-center space-x-2">
          <Crown className="h-5 w-5 text-yellow-400" />
          <span>Premium Plans</span>
        </h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Time-window banner */}
        {windowOpen ? (
          <div className="flex items-center space-x-3 bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-green-400">
            <Zap className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-semibold">Payment window is open! You can subscribe right now (10–11 AM IST).</p>
          </div>
        ) : (
          <div className="flex items-center space-x-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-amber-400">
            <Clock className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold">Payment window is closed.</p>
              <p className="text-xs text-amber-300 mt-0.5">
                Payments are only accepted between <strong>10:00 AM – 11:00 AM IST</strong>.
                Current IST hour: <strong>{istHour}:xx</strong>
              </p>
            </div>
          </div>
        )}

        {/* Current subscription status */}
        {subscription && (
          <Card className="border-blue-500/40 bg-blue-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Plan</p>
                  <p className="font-bold text-lg capitalize text-foreground">{subscription.plan}</p>
                  {subscription.invoiceNumber && (
                    <p className="text-xs text-muted-foreground mt-0.5">Invoice: {subscription.invoiceNumber}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Tweets this month</p>
                  <p className="font-bold text-lg text-foreground">
                    {subscription.tweetsPostedThisMonth}
                    {subscription.tweetLimit !== -1 && (
                      <span className="text-muted-foreground font-normal text-sm"> / {subscription.tweetLimit}</span>
                    )}
                    {subscription.tweetLimit === -1 && (
                      <span className="text-muted-foreground font-normal text-sm"> (unlimited)</span>
                    )}
                  </p>
                  {tweetsLeft !== null && tweetsLeft <= 1 && (
                    <p className="text-xs text-red-400 mt-0.5 flex items-center justify-end space-x-1">
                      <AlertTriangle className="h-3 w-3" />
                      <span>{tweetsLeft === 0 ? "Limit reached!" : "1 tweet left"}</span>
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plan cards */}
        <div className="grid gap-4">
          {plans.map((plan) => {
            const isCurrent = subscription?.plan === plan.id;
            const features = PLAN_FEATURES[plan.id] || [];
            const isProcessing = processingPlan === plan.id;

            return (
              <Card
                key={plan.id}
                className={`border-2 transition-all duration-200 ${PLAN_COLORS[plan.id] || "border-border bg-background"} ${isCurrent ? "ring-2 ring-blue-500/50" : ""}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${PLAN_BADGE[plan.id]}`}>
                          {plan.name}
                        </span>
                        {isCurrent && (
                          <span className="text-xs text-blue-400 font-semibold bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-2xl font-extrabold text-foreground">{plan.label}</p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {plan.tweetLimit === -1 ? "∞ tweets" : `${plan.tweetLimit} tweet${plan.tweetLimit > 1 ? "s" : ""}`}
                    </div>
                  </div>

                  <ul className="space-y-1.5 mb-4">
                    {features.map((f) => (
                      <li key={f} className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.id === "free" ? (
                    <Button
                      disabled
                      className="w-full rounded-full bg-muted text-muted-foreground cursor-not-allowed"
                    >
                      {isCurrent ? "Current Plan" : "Default Plan"}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleSubscribe(plan)}
                      disabled={isCurrent || isProcessing || !windowOpen}
                      className={`w-full rounded-full font-bold transition-all ${
                        isCurrent
                          ? "bg-green-600/20 text-green-400 border border-green-600/30 cursor-not-allowed"
                          : !windowOpen
                          ? "bg-muted text-muted-foreground cursor-not-allowed"
                          : "bg-blue-500 hover:bg-blue-600 text-white"
                      }`}
                    >
                      {isProcessing ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Processing...</span>
                        </div>
                      ) : isCurrent ? (
                        <div className="flex items-center space-x-2">
                          <Check className="h-4 w-4" />
                          <span>Subscribed</span>
                        </div>
                      ) : !windowOpen ? (
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4" />
                          <span>Open 10–11 AM IST</span>
                        </div>
                      ) : (
                        `Subscribe – ${plan.label}`
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Info note */}
        <p className="text-xs text-muted-foreground text-center pb-4">
          After successful payment, an invoice will be emailed to you. Subscriptions are valid for 30 days.
          Tweet counters reset on renewal.
        </p>
      </div>
    </div>
  );
}
