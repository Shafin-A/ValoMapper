"use client";
import { BackgroundDecoration } from "@/components/landing/background-decoration";
import { HeaderActions } from "@/components/landing/header-actions";
import { HeroSection } from "@/components/landing/hero-section";
import { useCreateLobby } from "@/hooks/api/use-create-lobby";
import React, { useState } from "react";

const LandingPage = () => {
  const [isNavigating, setIsNavigating] = useState(false);
  const createLobbyMutation = useCreateLobby();

  const handleStartMapping = () => {
    setIsNavigating(true);
    createLobbyMutation.mutate(undefined, {
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
    </div>
  );
};

export default LandingPage;
