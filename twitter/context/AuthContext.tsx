"use client"
import React, { createContext, useContext, useState, useEffect } from "react";
import axiosInstance from "@/lib/axiosInstance";

interface User {
    id?: string;
    _id?: string;
    username: string;
    email: string;
    displayName: string;
    bio?: string;
    avatar: string;
    joinDate: string;
    location?: string;
    website?: string;
}

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    signup: (email: string, password: string, username: string, displayName: string) => Promise<void>;
    googlesignin: () => Promise<void>;
    isLoading: boolean;
    updateProfile: (profileData: { displayName: string; bio: string; location: string; website: string; }) => Promise<void>;
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
    const [isLoading, setIsLoading] = useState(true);

    const fetchLoggedInUser = async (email: string) => {
        try {
            const res = await axiosInstance.get(`/loggedinuser?email=${email}`);
            if (res.data) {
                const userData = { ...res.data, id: res.data._id };
                setUser(userData);
                localStorage.setItem("twitter-user", JSON.stringify(userData));
            }
        } catch (error) {
            console.error("Failed to fetch logged in user", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const savedUser = localStorage.getItem("twitter-user");
        if (savedUser) {
            try {
                const parsedUser = JSON.parse(savedUser);
                setUser(parsedUser);
                // Re-verify with backend
                fetchLoggedInUser(parsedUser.email);
            } catch (e) {
                console.error("Failed to parse saved user", e);
                localStorage.removeItem("twitter-user");
                setIsLoading(false);
            }
        } else {
            setIsLoading(false);
        }
    }, [])

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            // Backend doesn't have a specific login, using register as findOrCreate
            const res = await axiosInstance.post("/register", { email, displayName: email.split('@')[0], username: email.split('@')[0], avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}` });
            const userData = { ...res.data, id: res.data._id };
            setUser(userData);
            localStorage.setItem("twitter-user", JSON.stringify(userData));
        } catch (error) {
            console.error("Login failed", error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }

    const signup = async (email: string, password: string, username: string, displayName: string) => {
        setIsLoading(true);
        try {
            const res = await axiosInstance.post("/register", {
                email,
                username,
                displayName,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
            });
            const userData = { ...res.data, id: res.data._id };
            setUser(userData);
            localStorage.setItem("twitter-user", JSON.stringify(userData));
        } catch (error) {
            console.error("Signup failed", error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }

    const googlesignin = async () => {
        setIsLoading(true);
        try {
            // Mocking google signin response then registering
            const googleEmail = "vaibhav@gmail.com";
            const res = await axiosInstance.post("/register", {
                email: googleEmail,
                displayName: "Vaibhav Singh",
                username: "vaibhav_google",
                avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=800&q=80",
            });
            const userData = { ...res.data, id: res.data._id };
            setUser(userData);
            localStorage.setItem("twitter-user", JSON.stringify(userData));
        } catch (error) {
            console.error("Google signin failed", error);
        } finally {
            setIsLoading(false);
        }
    }

    const logout = async () => {
        setUser(null);
        localStorage.removeItem("twitter-user");
    }

    const updateProfile = async (profileData: { 
        displayName: string;
        bio: string;
        location: string;
        website: string;
    }) => {
        setIsLoading(true);
        if(!user) return;
        try {
            const res = await axiosInstance.patch(`/userupdate/${user.email}`, profileData);
            const userData = { ...res.data, id: res.data._id };
            setUser(userData);
            localStorage.setItem("twitter-user", JSON.stringify(userData));
        } catch (error) {
            console.error("Update profile failed", error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <AuthContext.Provider value={{ user, login, logout, signup, googlesignin, isLoading, updateProfile }}>
            {children}
        </AuthContext.Provider>
    )
}


