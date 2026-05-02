"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail } from "lucide-react";

function GoogleMark({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.7 4.7-6.1 8-11.3 8a12 12 0 1 1 7.9-21l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 16 19 13 24 13c3 0 5.7 1.1 7.8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.5 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.6 5.1C9.5 39.5 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C39.6 36 44 30.5 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();

  const handleDemoLogin = () => {
    window.localStorage.setItem("demo_logged_in", "true");
    const onboarded = window.localStorage.getItem("onboarding_complete") === "true";
    if (onboarded) {
      router.push("/dashboard");
    } else {
      window.localStorage.setItem("onboarding_complete", "false");
      router.push("/onboarding");
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="grid lg:grid-cols-2 gap-10 lg:gap-16 max-w-5xl w-full items-center"
      >
        {/* Left: brand + illustration */}
        <div className="text-center lg:text-left order-2 lg:order-1">
          <h1 className="font-serif text-6xl lg:text-7xl text-forest-primary leading-none">
            Finsight.
          </h1>
          <h2 className="mt-6 font-serif text-2xl lg:text-3xl text-ink-primary leading-snug max-w-md mx-auto lg:mx-0">
            A second pair of eyes on your money.
          </h2>
          <p className="mt-3 text-ink-secondary text-base lg:text-lg leading-relaxed max-w-md mx-auto lg:mx-0">
            Spots the drift. Explains the why. Tells you what (if anything) to do.
          </p>

          {/* Soft abstract illustration */}
          <div className="mt-10 flex justify-center lg:justify-start">
            <svg
              viewBox="0 0 320 220"
              className="w-full max-w-md"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <defs>
                <linearGradient id="brandLine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#2563EB" />
                  <stop offset="1" stopColor="#60A5FA" />
                </linearGradient>
              </defs>
              <circle cx="120" cy="110" r="90" fill="#DBEAFE" opacity="0.8" />
              <circle cx="200" cy="130" r="70" fill="#EFF6FF" opacity="0.95" />
              <circle cx="170" cy="80" r="50" fill="#E5EDF7" />
              <path
                d="M 100 180 Q 130 140, 160 170 T 220 160"
                stroke="url(#brandLine)"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="220" cy="160" r="6" fill="#2563EB" />
              <path
                d="M170 60 C 170 50, 178 50, 178 60 C 178 70, 170 75, 170 75 C 170 75, 162 70, 162 60 C 162 50, 170 50, 170 60 Z"
                fill="#60A5FA"
                opacity="0.55"
              />
            </svg>
          </div>
        </div>

        {/* Right: card with login */}
        <div className="order-1 lg:order-2">
          <div className="bg-white rounded-3xl p-8 lg:p-10 shadow-card border border-line-soft">
            <h2 className="font-serif text-3xl text-ink-primary">Welcome back</h2>
            <p className="mt-2 text-ink-secondary">Sign in to your portfolio coach</p>

            <button
              onClick={handleDemoLogin}
              className="mt-8 w-full bg-forest-primary hover:bg-forest-deep text-white font-medium px-6 py-4 rounded-xl transition-all hover:translate-y-[-1px] active:translate-y-0 shadow-card"
            >
              Login as Demo User (Alex)
            </button>
            <p className="mt-3 text-xs text-ink-tertiary text-center">
              Demo mode — full auth available on request
            </p>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-line-soft" />
              <span className="text-xs text-ink-tertiary uppercase tracking-wide">
                or
              </span>
              <div className="h-px flex-1 bg-line-soft" />
            </div>

            <div className="space-y-3">
              <button
                disabled
                className="w-full bg-cream-soft text-ink-tertiary px-6 py-3 rounded-xl flex items-center justify-center gap-3 cursor-not-allowed border border-line-soft"
              >
                <GoogleMark className="w-5 h-5 grayscale opacity-70" />
                <span className="font-medium">Sign in with Google</span>
              </button>
              <button
                disabled
                className="w-full bg-cream-soft text-ink-tertiary px-6 py-3 rounded-xl flex items-center justify-center gap-3 cursor-not-allowed border border-line-soft"
              >
                <Mail className="w-5 h-5" />
                <span className="font-medium">Sign in with email</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
