"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Lock, Check, Copy, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import axiosInstance from '@/lib/axiosInstance';
import TwitterLogo from './Twitterlogo';

export default function ForgotPasswordForm() {
  const [identifier, setIdentifier] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleGeneratePassword = () => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const allLetters = uppercase + lowercase;
    let generated = '';
    for (let i = 0; i < 14; i++) {
      const randomIndex = Math.floor(Math.random() * allLetters.length);
      generated += allLetters[randomIndex];
    }
    setNewPassword(generated);
    setGeneratedPassword(generated);
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!newPassword) return;
    try {
      await navigator.clipboard.writeText(newPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter your email or phone number.');
      return;
    }
    if (!newPassword.trim()) {
      setError('Please enter or generate a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await axiosInstance.post('/reset-password', {
        identifier: identifier.trim(),
        newPassword: newPassword.trim(),
      });

      if (response.status === 200) {
        setSuccess(true);
      }
    } catch (err: any) {
      if (err.response) {
        // Handle specific server-side errors
        const errMsg = err.response.data?.error || 'Failed to reset password. Please try again.';
        setError(errMsg);
      } else {
        setError('Network error. Please check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center p-4">
        <Card className="w-full max-w-md bg-background border-border text-foreground shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-400 via-indigo-500 to-blue-600 animate-pulse" />
          <CardHeader className="text-center pb-4 pt-8">
            <div className="mb-4 flex justify-center">
              <div className="h-16 w-16 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20 text-blue-500 animate-bounce">
                <Check className="h-8 w-8" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Password Reset Successful</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your password has been updated successfully. You can now use your new password to sign in.
            </p>

            {generatedPassword && (
              <div className="bg-muted/50 rounded-xl p-4 border border-border/80 flex flex-col items-center justify-center space-y-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Your New Password</span>
                <div className="flex items-center space-x-2 bg-background border border-border/80 px-4 py-2 rounded-lg font-mono text-base select-all tracking-wider text-blue-400 font-bold">
                  <span>{generatedPassword}</span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy Password"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                {copied && <span className="text-[10px] text-green-500 font-medium">Copied to clipboard!</span>}
              </div>
            )}

            <Link href="/" className="block">
              <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-full text-base transition-all duration-200 shadow-lg shadow-blue-500/10">
                Back to Sign In
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center p-4">
      {/* Top Left Back Button */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors group">
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Home</span>
        </Link>
        <TwitterLogo size="md" className="text-foreground" />
      </div>

      <Card className="w-full max-w-md bg-background border-border text-foreground shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-blue-500" />
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold tracking-tight">Forgot password?</CardTitle>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            Enter your registered email address or phone number to securely reset your account password.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="bg-red-900/10 border border-red-800/40 rounded-xl p-4 text-red-400 text-sm flex items-start space-x-3 transition-all duration-300">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-red-400" />
              <div className="font-medium">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Identifier input */}
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-sm font-semibold text-foreground">Email or Phone Number</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Input
                  id="identifier"
                  type="text"
                  placeholder="Enter email or phone number"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="pl-10 bg-transparent border-border text-foreground placeholder-muted-foreground focus:ring-1 focus:ring-blue-500 focus:border-blue-500 h-11"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {/* New Password input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="newPassword" className="text-sm font-semibold text-foreground">New Password</Label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium inline-flex items-center space-x-1 hover:underline transition-colors"
                  disabled={isLoading}
                >
                  <Sparkles className="h-3 w-3 mr-0.5" />
                  <span>Generate Secure</span>
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Input
                  id="newPassword"
                  type="text"
                  placeholder="Enter password or generate one"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setGeneratedPassword('');
                  }}
                  className="pl-10 pr-10 bg-transparent border-border text-foreground placeholder-muted-foreground focus:ring-1 focus:ring-blue-500 focus:border-blue-500 h-11"
                  disabled={isLoading}
                  required
                />
                {newPassword && (
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy Password"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                )}
              </div>
              {copied && <p className="text-[10px] text-green-500 font-medium text-right mt-1">Copied to clipboard!</p>}
            </div>

            {/* Password Generator visual highlight block */}
            {generatedPassword && (
              <div className="bg-blue-950/15 border border-blue-900/25 rounded-xl p-3 flex items-start space-x-3 transition-all duration-300">
                <Sparkles className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-blue-400">Generated Safe Password</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    This password is securely created using <span className="text-foreground font-semibold">only letters</span> (uppercase & lowercase) for simplicity.
                  </p>
                  <div className="mt-2 flex items-center space-x-2">
                    <span className="font-mono text-sm bg-muted/60 border border-border px-2 py-1 rounded select-all font-bold tracking-wider text-blue-400">
                      {generatedPassword}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="text-xs text-blue-400 hover:text-blue-300 hover:underline flex items-center"
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-full text-base transition-all duration-200 shadow-lg shadow-blue-500/10 h-11"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Resetting Password...</span>
                </div>
              ) : (
                'Reset Password'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
