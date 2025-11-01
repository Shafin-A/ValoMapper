"use client";

import { BackgroundDecoration } from "@/components/landing/background-decoration";
import { HeaderActions } from "@/components/landing/header-actions";
import { HeroSection } from "@/components/landing/hero-section";
import { useCreateLobby } from "@/hooks/api/use-create-lobby";
import React from "react";

export const LandingPage = () => {
  const createLobbyMutation = useCreateLobby();

  return (
    <div className="min-h-screen text-foreground overflow-hidden relative">
      <BackgroundDecoration />
      <div className="relative">
        <HeaderActions />
        <HeroSection
          onStartMapping={() => createLobbyMutation.mutate()}
          isLoading={createLobbyMutation.isPending}
        />
      </div>
    </div>
  );
};

export default LandingPage;
