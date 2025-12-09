"use client";

import { Button } from "@/components/ui/button";
import { LANDING_MESSAGES } from "@/lib/consts";
import { ArrowRight, Crosshair, Loader2 } from "lucide-react";
import React from "react";

interface HeroSectionProps {
  onStartMapping: () => void;
  isLoading: boolean;
}

export const HeroSection = ({
  onStartMapping,
  isLoading,
}: HeroSectionProps) => {
  const handleStartMapping = async () => {
    onStartMapping();
  };

  return (
    <main className="container mx-auto px-8 py-32 flex flex-col items-center text-center justify-center min-h-screen">
      <div className="relative mx-auto max-w-[90vw]">
        <div className="absolute -left-8 md:-left-16 top-0 text-4xl md:text-6xl text-primary/30 font-mono">
          [
        </div>
        <h1 className="text-7xl sm:text-8xl md:text-9xl font-bold mb-4 tracking-tighter">
          <span className="bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
            ValoMapper
          </span>
        </h1>
        <div className="absolute -right-8 md:-right-16 bottom-0 text-4xl md:text-6xl text-primary/30 font-mono">
          ]
        </div>
      </div>

      <div className="font-mono text-muted-foreground mb-12">
        {LANDING_MESSAGES.map((message, index) => (
          <React.Fragment key={index}>
            <span className="text-primary">{">"}</span> {message}
            <br />
          </React.Fragment>
        ))}
      </div>

      <div>
        <Button
          size="lg"
          className="group text-base px-8 py-6 hover:scale-105 transition-all duration-300 shadow-xl font-mono uppercase tracking-wider relative overflow-hidden hover:will-change-transform"
          onClick={handleStartMapping}
          disabled={isLoading}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-ring opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <span className="relative flex items-center gap-2">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Crosshair className="w-4 h-4" />
                Start Mapping
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </>
            )}
          </span>
        </Button>
      </div>
    </main>
  );
};
