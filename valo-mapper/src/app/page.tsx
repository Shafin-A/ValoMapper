"use client";
import { BackgroundDecoration } from "@/components/landing/background-decoration";
import { HeaderActions } from "@/components/landing/header-actions";
import { ExternalLinks } from "@/components/shared/external-links";
import { HeroSection } from "@/components/landing/hero-section";
import { useCreateLobby } from "@/hooks/api/use-create-lobby";
import Link from "next/link";
import React, { useState } from "react";

const LandingPage = () => {
  const [isNavigating, setIsNavigating] = useState(false);
  const createLobbyMutation = useCreateLobby();

  const handleStartMapping = () => {
    setIsNavigating(true);
    createLobbyMutation.mutate(undefined, {
      onSuccess: () => {
        // Reset after a timeout in case navigation fails
        setTimeout(() => setIsNavigating(false), 5000);
      },
      onError: () => {
        setIsNavigating(false);
      },
    });
  };

  return (
    <div className="min-h-screen text-foreground overflow-hidden relative">
      <BackgroundDecoration />
      <div className="relative">
        <HeaderActions />
        <HeroSection
          onStartMapping={handleStartMapping}
          isLoading={createLobbyMutation.isPending || isNavigating}
        />
      </div>
      <ExternalLinks />
      <footer className="absolute inset-x-0 bottom-5 z-10 flex flex-col items-center justify-center gap-1 font-mono text-[11px] tracking-wide text-muted-foreground/60 sm:flex-row sm:gap-3">
        <span>© {new Date().getFullYear()} ValoMapper</span>
        <span aria-hidden className="hidden text-muted-foreground/30 sm:inline">
          ·
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/terms-of-service"
            className="transition-colors hover:text-foreground"
          >
            Terms of Service
          </Link>
          <span aria-hidden className="text-muted-foreground/30">
            ·
          </span>
          <Link
            href="/privacy-policy"
            className="transition-colors hover:text-foreground"
          >
            Privacy Policy
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
