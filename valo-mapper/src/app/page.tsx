"use client";
import { BackgroundDecoration } from "@/components/landing/background-decoration";
import { HeaderActions } from "@/components/landing/header-actions";
import { ExternalLinks } from "@/components/shared/external-links";
import { HeroSection } from "@/components/landing/hero-section";
import { useCreateLobby } from "@/hooks/api/use-create-lobby";
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
    </div>
  );
};

export default LandingPage;
