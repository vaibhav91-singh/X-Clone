"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigation } from "@/context/NavigationContext";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import {
  Image,
  Smile,
  Calendar,
  MapPin,
  BarChart3,
  Globe,
  Mic,
  X,
  CheckCircle2,
  Volume2,
  Loader2,
  Crown,
} from "lucide-react";
import { Separator } from "./ui/separator";
import axios from "axios";
import axiosInstance from "@/lib/axiosInstance";

const TweetComposer = ({ onTweetPosted, onNavigateToSubscription }: any) => {
  const { user } = useAuth();
  const { navigate } = useNavigation();
  const goToSubscription = onNavigateToSubscription ?? navigate;

  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [imageurl, setimageurl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState("");
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [audioFileName, setAudioFileName] = useState("");
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [audioBase64, setAudioBase64] = useState("");
  const [limitReached, setLimitReached] = useState(false);
  const [limitInfo, setLimitInfo] = useState<{ plan: string; limit: number } | null>(null);

  const maxLength = 200;
  const characterCount = content.length;
  const isOverLimit = characterCount > maxLength;
  const isNearLimit = characterCount > maxLength * 0.8;

  const checkTimeWindow = () => {
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(Date.now() + istOffset);
    const hours = istTime.getUTCHours();
    return hours >= 14 && hours < 19;
  };

  const validateAndProcessAudio = (fileOrBlob: Blob | File, name = "recorded-audio.ogg") => {
    if (!checkTimeWindow()) {
      alert("Audio uploads and tweets can only be made between 2:00 PM and 7:00 PM IST.");
      return;
    }
    if (fileOrBlob.size > 100 * 1024 * 1024) {
      alert("Audio file size exceeds the 100 MB limit.");
      return;
    }
    const localUrl = URL.createObjectURL(fileOrBlob);
    const audio = new Audio(localUrl);
    audio.onloadedmetadata = () => {
      if (audio.duration > 300) {
        alert("Audio file duration exceeds the 5 minutes limit.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result as string;
        setAudioBase64(base64Data);
        setAudioFileName(name);
        setAudioDuration(audio.duration);
        setAudioUrl(localUrl);
        setAudioBlob(fileOrBlob);
        setIsOtpVerified(false);
        setOtp("");
        handleSendOtp();
      };
      reader.readAsDataURL(fileOrBlob);
    };
    audio.onerror = () => {
      alert("Could not load audio metadata. Please make sure it's a valid audio file.");
    };
  };

  const startRecording = async () => {
    if (!checkTimeWindow()) {
      alert("Audio tweets can only be posted between 2:00 PM and 7:00 PM IST.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" });
        validateAndProcessAudio(blob, "recorded-audio.ogg");
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const handleSendOtp = async () => {
    if (!user) return;
    try {
      await axiosInstance.post("/send-otp", { email: user.email });
      setShowOtpInput(true);
      alert(`OTP sent to ${user.email} (check backend console for code)`);
    } catch (err) {
      console.error("Failed to send OTP", err);
    }
  };

  const handleVerifyOtp = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      await axiosInstance.post("/verify-otp", { email: user.email, otp });
      setIsOtpVerified(true);
      setShowOtpInput(false);
      setIsUploadingAudio(true);
      const res = await axiosInstance.post("/upload-audio", {
        email: user.email,
        audioData: audioBase64,
        duration: audioDuration,
        fileName: audioFileName,
      });
      setAudioUrl(res.data.url);
      alert("OTP verified and audio uploaded successfully!");
    } catch (err: any) {
      alert(err.response?.data?.error || "OTP verification or upload failed.");
    } finally {
      setIsUploadingAudio(false);
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !content.trim()) return;
    try {
      const authorId = user.id || (user as any)._id;
      const res = await axiosInstance.post("/post", {
        author: authorId,
        content,
        image: imageurl,
        audio: audioUrl,
      });
      onTweetPosted({ ...res.data, id: res.data._id });
      setContent("");
      setimageurl("");
      setAudioUrl("");
      setAudioBlob(null);
      setIsOtpVerified(false);
      setOtp("");
      setLimitReached(false);
    } catch (error: any) {
      if (error.response?.status === 429) {
        setLimitReached(true);
        setLimitInfo({
          plan: error.response.data.plan || "free",
          limit: error.response.data.tweetLimit || 1,
        });
        return;
      }
      // Fallback mock tweet when backend unavailable
      onTweetPosted({
        id: Math.random().toString(36).slice(2, 9),
        author: user,
        content,
        image: imageurl,
        timestamp: "just now",
        likes: 0,
        retweets: 0,
        comments: 0,
      });
      setContent("");
      setimageurl("");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsLoading(true);
    const image = e.target.files[0];
    const formData = new FormData();
    formData.set("image", image);
    try {
      const res = await axios.post(
        "https://api.imgbb.com/1/upload?key=97f3fb960c3520d6a88d7e29679cf96f",
        formData
      );
      setimageurl(res.data.data.display_url);
    } catch (err) {
      console.error("Image upload failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  // ── Tweet limit reached banner ─────────────────────────────────────────────
  if (limitReached && limitInfo) {
    return (
      <Card className="bg-background border-border border-x-0 border-t-0 rounded-none">
        <CardContent className="p-4">
          <div className="flex flex-col items-center text-center space-y-3 py-4">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-full p-3">
              <Crown className="h-7 w-7 text-yellow-400" />
            </div>
            <h3 className="font-bold text-foreground text-lg">Tweet Limit Reached</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              You&apos;ve used all <strong>{limitInfo.limit}</strong>{" "}
              tweet{limitInfo.limit > 1 ? "s" : ""} on your{" "}
              <span className="capitalize font-semibold text-foreground">{limitInfo.plan}</span>{" "}
              plan this month. Upgrade to post more!
            </p>
            <Button
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-full px-6"
              onClick={() => goToSubscription("subscription")}
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade Plan
            </Button>
            <button
              className="text-xs text-muted-foreground hover:underline"
              onClick={() => setLimitReached(false)}
            >
              Dismiss
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Main composer ──────────────────────────────────────────────────────────
  return (
    <Card className="bg-background border-border border-x-0 border-t-0 rounded-none">
      <CardContent className="p-4">
        <div className="flex space-x-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.avatar} alt={user.displayName} />
            <AvatarFallback>{user.displayName[0]}</AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <form onSubmit={handleSubmit}>
              {!checkTimeWindow() && (
                <div className="mb-3 p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-500 text-xs flex items-center space-x-2">
                  <span>
                    ⚠️ Audio tweets are only permitted between 2:00 PM – 7:00 PM IST.
                  </span>
                </div>
              )}

              <Textarea
                placeholder="What's happening?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="bg-transparent border-none text-xl text-foreground placeholder-muted-foreground resize-none min-h-[120px] focus-visible:ring-0 focus-visible:ring-offset-0"
              />

              <div className="flex items-center justify-between mt-4">
                {/* Toolbar */}
                <div className="flex items-center space-x-4 text-blue-400">
                  <label htmlFor="tweetImage" className="p-2 rounded-full hover:bg-blue-900/20 cursor-pointer">
                    <Image className="h-5 w-5" />
                    <input
                      type="file"
                      accept="image/*"
                      id="tweetImage"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={isLoading}
                    />
                  </label>

                  <Button variant="ghost" size="sm" className="p-2 rounded-full hover:bg-blue-900/20" type="button">
                    <BarChart3 className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-2 rounded-full hover:bg-blue-900/20" type="button">
                    <Smile className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-2 rounded-full hover:bg-blue-900/20" type="button">
                    <Calendar className="h-5 w-5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className={`p-2 rounded-full hover:bg-blue-900/20 ${isRecording ? "text-red-500 animate-pulse bg-red-500/10" : ""}`}
                    onClick={isRecording ? stopRecording : startRecording}
                    type="button"
                    disabled={!checkTimeWindow() || isLoading || isUploadingAudio}
                  >
                    <Mic className="h-5 w-5" />
                  </Button>

                  <label
                    htmlFor="audioUpload"
                    className={`p-2 rounded-full hover:bg-blue-900/20 cursor-pointer flex items-center ${
                      !checkTimeWindow() || isLoading || isUploadingAudio ? "opacity-40 cursor-not-allowed" : ""
                    }`}
                  >
                    <Volume2 className="h-5 w-5" />
                    <input
                      type="file"
                      accept="audio/*"
                      id="audioUpload"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          validateAndProcessAudio(e.target.files[0], e.target.files[0].name);
                        }
                      }}
                      disabled={!checkTimeWindow() || isLoading || isUploadingAudio}
                    />
                  </label>

                  <Button variant="ghost" size="sm" className="p-2 rounded-full hover:bg-blue-900/20" type="button">
                    <MapPin className="h-5 w-5" />
                  </Button>
                </div>

                {/* Right side: character count + post */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Globe className="h-4 w-4 text-blue-400" />
                    <span className="text-sm text-blue-400 font-semibold">Everyone can reply</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    {characterCount > 0 && (
                      <div className="flex items-center space-x-2">
                        <div className="relative w-8 h-8">
                          <svg className="w-8 h-8 transform -rotate-90">
                            <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" fill="none" className="text-muted" />
                            <circle
                              cx="16" cy="16" r="14"
                              stroke="currentColor" strokeWidth="2" fill="none"
                              strokeDasharray={`${2 * Math.PI * 14}`}
                              strokeDashoffset={`${2 * Math.PI * 14 * (1 - characterCount / maxLength)}`}
                              className={isOverLimit ? "text-red-500" : isNearLimit ? "text-yellow-500" : "text-blue-500"}
                            />
                          </svg>
                        </div>
                        {isNearLimit && (
                          <span className={`text-sm ${isOverLimit ? "text-red-500" : "text-yellow-500"}`}>
                            {maxLength - characterCount}
                          </span>
                        )}
                      </div>
                    )}
                    <Separator orientation="vertical" className="h-6 bg-border" />
                    <Button
                      type="submit"
                      disabled={!content.trim() || isOverLimit || isLoading || !!(audioBlob && !isOtpVerified)}
                      className="bg-blue-500 hover:bg-blue-600 disabled:bg-muted disabled:text-muted-foreground text-white font-semibold rounded-full px-6"
                    >
                      Post
                    </Button>
                  </div>
                </div>
              </div>

              {/* Audio preview + OTP */}
              {(audioUrl || isUploadingAudio) && (
                <div className="mt-4 p-3 bg-muted/30 rounded-xl border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Mic className="h-4 w-4 text-blue-400" />
                      <span className="text-sm font-semibold text-blue-400">
                        {isUploadingAudio ? "Uploading Audio Tweet..." : "Audio Tweet Attached"}
                      </span>
                    </div>
                    {!isUploadingAudio && (
                      <Button
                        variant="ghost" size="sm" type="button"
                        onClick={() => { setAudioUrl(""); setAudioBlob(null); setIsOtpVerified(false); setAudioBase64(""); setAudioFileName(""); setAudioDuration(null); }}
                        className="text-muted-foreground hover:text-foreground p-1 h-auto"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {isUploadingAudio ? (
                    <div className="flex items-center justify-center p-6 space-x-3">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                      <span className="text-sm text-muted-foreground">Processing and uploading...</span>
                    </div>
                  ) : (
                    <>
                      <audio src={audioUrl} controls className="w-full h-10 mb-3 rounded-lg" />
                      {!isOtpVerified && showOtpInput && (
                        <div className="space-y-3 bg-blue-500/5 p-3 rounded-lg border border-blue-500/20">
                          <p className="text-xs text-blue-400 font-semibold">🔒 Secure Upload: Email OTP Required</p>
                          <p className="text-[11px] text-muted-foreground">
                            OTP sent to <strong>{user.email}</strong>. Check backend console.
                          </p>
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              placeholder="Enter 6-digit OTP"
                              value={otp}
                              onChange={(e) => setOtp(e.target.value)}
                              className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground flex-1 focus:border-blue-500 outline-none"
                            />
                            <Button onClick={handleVerifyOtp} size="sm" type="button"
                              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg px-4">
                              Verify
                            </Button>
                          </div>
                        </div>
                      )}
                      {isOtpVerified && (
                        <div className="flex items-center space-x-2 text-green-500 text-xs font-semibold bg-green-500/10 p-2.5 rounded-lg border border-green-500/20">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Security Verified &amp; Saved on Server</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TweetComposer;
