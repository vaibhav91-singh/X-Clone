"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import axiosInstance from "@/lib/axiosInstance";
import { useAuth } from "./AuthContext";

interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (lang: string) => Promise<void>;
  requestLanguageChange: (targetLang: string) => Promise<{ deliveryMethod: string; message: string }>;
  verifyLanguageChange: (otp: string, targetLang: string) => Promise<void>;
  availableLanguages: { code: string; name: string; nativeName: string }[];
  isChangingLanguage: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context == null) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const [currentLanguage, setCurrentLanguage] = useState("en");
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);

  const availableLanguages = [
    { code: "en", name: "English", nativeName: "English" },
    { code: "es", name: "Spanish", nativeName: "Español" },
    { code: "hi", name: "Hindi", nativeName: "हिंदी" },
    { code: "pt", name: "Portuguese", nativeName: "Português" },
    { code: "zh", name: "Chinese", nativeName: "中文" },
    { code: "fr", name: "French", nativeName: "Français" },
  ];

  // Load user's preferred language from backend or localStorage
  useEffect(() => {
    const loadLanguage = async () => {
      if (user?.email) {
        try {
          const response = await axiosInstance.get(`/loggedinuser?email=${user.email}`);
          const preferredLang = response.data.preferredLanguage || "en";
          setCurrentLanguage(preferredLang);
          i18n.changeLanguage(preferredLang);
        } catch (error) {
          console.error("Failed to load user language:", error);
          const storedLang = localStorage.getItem("preferred-language") || "en";
          setCurrentLanguage(storedLang);
          i18n.changeLanguage(storedLang);
        }
      } else {
        const storedLang = localStorage.getItem("preferred-language") || "en";
        setCurrentLanguage(storedLang);
        i18n.changeLanguage(storedLang);
      }
    };

    loadLanguage();
  }, [user, i18n]);

  // Change language without authentication (for non-logged-in users)
  const changeLanguage = async (lang: string) => {
    setIsChangingLanguage(true);
    try {
      i18n.changeLanguage(lang);
      setCurrentLanguage(lang);
      localStorage.setItem("preferred-language", lang);
    } catch (error) {
      console.error("Failed to change language:", error);
      throw error;
    } finally {
      setIsChangingLanguage(false);
    }
  };

  // Request language change with OTP (for logged-in users)
  const requestLanguageChange = async (targetLang: string) => {
    if (!user?.email) {
      throw new Error("User must be logged in to request language change");
    }

    setIsChangingLanguage(true);
    try {
      const response = await axiosInstance.post("/language/request-change", {
        email: user.email,
        targetLanguage: targetLang,
      });
      return {
        deliveryMethod: response.data.deliveryMethod,
        message: response.data.message,
      };
    } catch (error: any) {
      console.error("Failed to request language change:", error);
      throw new Error(error.response?.data?.error || "Failed to send OTP");
    } finally {
      setIsChangingLanguage(false);
    }
  };

  // Verify OTP and complete language change
  const verifyLanguageChange = async (otp: string, targetLang: string) => {
    if (!user?.email) {
      throw new Error("User must be logged in to verify language change");
    }

    setIsChangingLanguage(true);
    try {
      const response = await axiosInstance.post("/language/verify-change", {
        email: user.email,
        otp,
        targetLanguage: targetLang,
      });

      // Update local state and i18n
      i18n.changeLanguage(targetLang);
      setCurrentLanguage(targetLang);
      localStorage.setItem("preferred-language", targetLang);

      return response.data;
    } catch (error: any) {
      console.error("Failed to verify language change:", error);
      throw new Error(error.response?.data?.error || "Failed to verify OTP");
    } finally {
      setIsChangingLanguage(false);
    }
  };

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        changeLanguage,
        requestLanguageChange,
        verifyLanguageChange,
        availableLanguages,
        isChangingLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};
