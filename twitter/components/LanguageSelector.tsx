"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Globe, Check, Lock } from "lucide-react";

export default function LanguageSelector() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    currentLanguage,
    changeLanguage,
    requestLanguageChange,
    verifyLanguageChange,
    availableLanguages,
    isChangingLanguage,
  } = useLanguage();

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState("");
  const [selectedLang, setSelectedLang] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"email" | "sms" | "">("");
  const [otpMessage, setOtpMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleLanguageSelect = async (langCode: string) => {
    setError("");
    setSuccess("");

    // If user is not logged in, change language directly
    if (!user) {
      try {
        await changeLanguage(langCode);
        setSuccess(t("language.languageChanged"));
      } catch (err) {
        setError(t("common.error"));
      }
      return;
    }

    // If user is logged in, request OTP
    setSelectedLang(langCode);
    try {
      const result = await requestLanguageChange(langCode);
      setDeliveryMethod(result.deliveryMethod as "email" | "sms");
      setOtpMessage(result.message);
      setShowOtpModal(true);
    } catch (err: any) {
      setError(err.message || t("common.error"));
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setError("");
    try {
      await verifyLanguageChange(otp, selectedLang);
      setSuccess(t("language.languageChanged"));
      setShowOtpModal(false);
      setOtp("");
      setSelectedLang("");
      setDeliveryMethod("");
      setOtpMessage("");
    } catch (err: any) {
      setError(err.message || t("language.invalidOtp"));
    }
  };

  const getCurrentLanguageName = () => {
    const lang = availableLanguages.find((l) => l.code === currentLanguage);
    return lang?.nativeName || "English";
  };

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 rounded-full"
          >
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">{getCurrentLanguageName()}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5 text-sm font-semibold">
            {t("language.selectLanguage")}
          </div>
          <div className="h-px bg-border my-1" />
          {availableLanguages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => handleLanguageSelect(lang.code)}
              disabled={isChangingLanguage}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex flex-col">
                <span className="font-medium">{lang.nativeName}</span>
                <span className="text-xs text-muted-foreground">{lang.name}</span>
              </div>
              {currentLanguage === lang.code && (
                <Check className="h-4 w-4 text-blue-500" />
              )}
            </DropdownMenuItem>
          ))}
          {user && (
            <>
              <div className="h-px bg-border my-1" />
              <div className="px-2 py-2 text-xs text-muted-foreground">
                <Lock className="h-3 w-3 inline mr-1" />
                {t("language.frenchEmailVerification")}
                <br />
                {t("language.otherLanguagesPhoneVerification")}
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Success/Error Messages */}
      {success && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {success}
        </div>
      )}
      {error && !showOtpModal && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {error}
        </div>
      )}

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-xl font-bold mb-4">
              {t("language.verificationRequired")}
            </h3>
            
            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm text-blue-400">
                {deliveryMethod === "email"
                  ? t("language.otpSentEmail")
                  : t("language.otpSentPhone")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{otpMessage}</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="otp">{t("language.enterOtp")}</Label>
                <Input
                  id="otp"
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => {
                    setError("");
                    setOtp(e.target.value.replace(/\D/g, ""));
                  }}
                  className="text-center text-2xl tracking-widest font-mono"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-3 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowOtpModal(false);
                    setOtp("");
                    setError("");
                    setSelectedLang("");
                  }}
                  className="flex-1"
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={handleVerifyOtp}
                  disabled={isChangingLanguage || otp.length !== 6}
                  className="flex-1 bg-blue-500 hover:bg-blue-600"
                >
                  {isChangingLanguage ? t("common.loading") : t("language.verifyAndChange")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
