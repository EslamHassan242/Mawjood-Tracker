"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password. Please try again.");
        setIsLoading(false);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-light-bg dark:bg-dark-bg transition-colors duration-300">
      <div className="w-full max-w-md flex flex-col gap-6 animate-fade-in-up">
        {/* Logo and Brand */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="relative w-24 h-24 rounded-3xl overflow-hidden shadow-md bg-white p-1 border border-brand-green-500/10">
            <Image
              src="/logo.png"
              alt="Mawjood Logo"
              fill
              sizes="96px"
              priority
              className="object-cover"
            />
          </div>
          <div className="flex flex-col gap-0.5 mt-1">
            <h1 className="text-2xl font-bold tracking-tight text-light-text-main dark:text-dark-text-main">
              Mawjood Tracker
            </h1>
            <p className="text-sm font-semibold text-brand-gold-600 dark:text-brand-gold-500 uppercase tracking-widest">
              Internal Operations Portal
            </p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl border-light-border dark:border-dark-border">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-lg font-bold text-light-text-main dark:text-dark-text-main">
                Welcome back
              </h2>
              <p className="text-xs font-semibold text-light-text-muted dark:text-dark-text-muted">
                Please sign in to your operations account.
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs font-semibold text-red-600 dark:text-red-400 animate-fade-in-up">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-4">
              {/* Email Input */}
              <Input
                label="Operations Email"
                type="email"
                placeholder="name@mawjood.app"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail size={18} />}
                required
                disabled={isLoading}
              />

              {/* Password Input */}
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<Lock size={18} />}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-[38px] text-light-text-muted/70 dark:text-dark-text-muted/70 hover:text-light-text-main dark:hover:text-dark-text-main cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full py-3 mt-1 cursor-pointer"
              isLoading={isLoading}
            >
              Sign In to Dashboard
            </Button>
          </form>
        </Card>

        {/* Info Footer */}
        <div className="text-center">
          <p className="text-xs font-medium text-light-text-muted/60 dark:text-dark-text-muted/60">
            For internal monitoring and revenue tracking only.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-light-bg dark:bg-dark-bg text-light-text-muted/60 dark:text-dark-text-muted/60 font-semibold text-sm">
        Loading Portal...
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
