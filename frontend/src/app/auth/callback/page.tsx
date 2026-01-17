"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";

function AuthCallbackContent() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error) {
      console.error("Auth error:", error);
      router.push("/?error=" + encodeURIComponent(error));
      return;
    }

    if (token) {
      login(token);
      // Wait a moment for the auth state to update, then redirect
      setTimeout(() => {
        router.push("/onboarding");
      }, 500);
    } else {
      router.push("/");
    }
  }, [searchParams, login, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="lg" text="Completing sign in..." />
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <LoadingSpinner size="lg" text="Loading..." />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
