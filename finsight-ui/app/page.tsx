"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const loggedIn = window.localStorage.getItem("demo_logged_in") === "true";
    const onboarded = window.localStorage.getItem("onboarding_complete") === "true";
    if (loggedIn && onboarded) {
      router.replace("/dashboard");
    } else if (loggedIn) {
      router.replace("/onboarding");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <div className="text-ink-tertiary text-sm">Loading…</div>
    </div>
  );
}
