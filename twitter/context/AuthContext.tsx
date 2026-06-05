"use client"
import React, { createContext, useContext, useState, useEffect } from "react";
import axiosInstance from "@/lib/axiosInstance";

interface User {
    id: string;
    _id?: string;
    username: string;
    email: string;
    displayName: string;
    bio?: string;
    avatar: string;
    joinDate?: string;
    joineDate?: string; // legacy typo kept for compatibility
    location?: string;
    website?: string;
    notificationsEnabled?: boolean;
}

interface DeviceInfo {
    browser: string;
    os: string;
    device: string;
}

interface LoginResponse {
    requiresOTP: boolean;
    message: string;
    user?: User;
    loginRecordId?: string;
    deviceInfo?: DeviceInfo;
}

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<LoginResponse>;
    verifyLoginOTP: (email: string, otp: string, loginRecordId?: string) => Promise<void>;
    logout: () => Promise<void>;
    signup: (email: string, password: string, username: string, displayName: string) => Promise<void>;
    loading: boolean;
    isloading: boolean;
    isLoading: boolean;
    updateProfile: (profileData: Partial<User>) => Promise<void>;
    googlesignin: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context == null) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isloading, setIsLoading] = useState(false);

    useEffect(() => {
        const saveduser = localStorage.getItem("twitter-user");
        if (saveduser) {
            setUser(JSON.parse(saveduser));
        }
    }, []);

    const login = async (email: string, password: string): Promise<LoginResponse> => {
        setIsLoading(true);
        try {
            const response = await axiosInstance.post("/auth/initiate-login", {
                email,
                password,
            });

            const data: LoginResponse = response.data;

            if (!data.requiresOTP) {
                // Direct login successful (Microsoft browser or non-Chrome)
                if (data.user) {
                    const userWithId = { ...data.user, id: data.user._id || "1" };
                    setUser(userWithId);
                    localStorage.setItem("twitter-user", JSON.stringify(userWithId));
                }
            }
            // If requiresOTP is true, we'll wait for OTP verification

            setIsLoading(false);
            return data;
        } catch (error: any) {
            setIsLoading(false);
            throw new Error(error.response?.data?.error || "Login failed");
        }
    };

    const verifyLoginOTP = async (email: string, otp: string, loginRecordId?: string) => {
        setIsLoading(true);
        try {
            const response = await axiosInstance.post("/auth/verify-login-otp", {
                email,
                otp,
                loginRecordId,
            });

            const userData = response.data.user;
            const userWithId = { ...userData, id: userData._id || "1" };
            setUser(userWithId);
            localStorage.setItem("twitter-user", JSON.stringify(userWithId));
            setIsLoading(false);
        } catch (error: any) {
            setIsLoading(false);
            throw new Error(error.response?.data?.error || "OTP verification failed");
        }
    };

    const signup = async (email: string, password: string, username: string, displayName: string) => {
        setIsLoading(true);
        try {
            // Register user
            const response = await axiosInstance.post("/register", {
                email,
                password,
                username,
                displayName,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
            });

            const userData = response.data;
            const userWithId = { ...userData, id: userData._id || "1" };
            setUser(userWithId);
            localStorage.setItem("twitter-user", JSON.stringify(userWithId));
            setIsLoading(false);
        } catch (error: any) {
            setIsLoading(false);
            throw new Error(error.response?.data?.error || "Signup failed");
        }
    };

    const logout = async () => {
        setIsLoading(true);
        await new Promise((resolve) => setTimeout(resolve, 500));
        setUser(null);
        localStorage.removeItem("twitter-user");
        setIsLoading(false);
    };

    const updateProfile = async (profileData: Partial<User>) => {
        setIsLoading(true);
        if (!user) return;
        
        try {
            const response = await axiosInstance.patch(`/userupdate/${user.email}`, profileData);
            const updatedUser = { ...response.data, id: response.data._id || user.id };
            setUser(updatedUser);
            localStorage.setItem("twitter-user", JSON.stringify(updatedUser));
            setIsLoading(false);
        } catch (error) {
            setIsLoading(false);
            throw error;
        }
    };

    const googlesignin = () => {
        // Mock Google sign-in — uses same mock flow as login
        login("google@example.com", "mock-google-password");
    };

    return (
        <AuthContext.Provider value={{
            user,
            login,
            verifyLoginOTP,
            logout,
            signup,
            isloading,
            isLoading: isloading,
            loading: isloading,
            updateProfile,
            googlesignin,
        }}>
            {children}
        </AuthContext.Provider>
    );
};
