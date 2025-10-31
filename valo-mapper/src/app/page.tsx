"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Crosshair } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";

export const LandingPage = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen text-foreground overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden opacity-10">
        <div
          className="absolute top-[5%] left-[5%] w-[15vw] h-[15vw] max-w-32 max-h-32 flex items-center justify-center"
          style={
            {
              animation:
                "float 8s ease-in-out infinite, spin-slow 18s linear infinite reverse",
              "--rotation": "0deg",
            } as React.CSSProperties
          }
        >
          <Crosshair className="w-full h-full text-primary/30" />
        </div>
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[20vw] h-[20vw] max-w-44 max-h-44 flex items-center justify-center"
          style={
            {
              animation: "spin-slow 25s linear infinite",
              "--rotation": "0deg",
            } as React.CSSProperties
          }
        >
          <Crosshair className="w-full h-full text-primary/30" />
        </div>
        <div
          className="absolute top-[15%] right-[10%] w-[12vw] h-[12vw] max-w-24 max-h-24 border border-ring"
          style={
            {
              animation: "spin-slow 15s linear infinite",
              "--rotation": "12deg",
            } as React.CSSProperties
          }
        />
        <div
          className="absolute bottom-[15%] left-1/4 w-[18vw] h-[18vw] max-w-40 max-h-40 border border-accent-foreground"
          style={
            {
              animation:
                "float 9s ease-in-out infinite, pulse-scale 14s ease-in-out infinite",
              "--rotation": "-12deg",
            } as React.CSSProperties
          }
        />
        <div
          className="absolute bottom-[25%] right-1/3 w-[14vw] h-[14vw] max-w-28 max-h-28 border border-primary"
          style={
            {
              animation:
                "spin-slow 20s linear infinite reverse, pulse-scale 10s ease-in-out infinite",
              "--rotation": "45deg",
              animationDelay: "2s",
            } as React.CSSProperties
          }
        />
      </div>

      <div className="relative">
        <div className="absolute top-8 right-8 flex gap-3">
          <Button
            variant="ghost"
            className="transition-all hover:scale-105 will-change-transform"
          >
            My Strategies
          </Button>
          <Button
            variant="outline"
            className="transition-all hover:scale-105 will-change-transform"
          >
            Login / Register
          </Button>
        </div>

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
            <span className="text-primary">{">"}</span> Design strategies that
            win rounds
            <br />
            <span className="text-primary">{">"}</span> Coordinate executes with
            pixel-perfect precision
            <br />
            <span className="text-primary">{">"}</span> Share tactics that
            dominate ranked
          </div>

          <div>
            <Button
              size="lg"
              className="group text-base px-8 py-6 hover:scale-105 transition-all duration-300 shadow-xl font-mono uppercase tracking-wider relative overflow-hidden will-change-transform"
              onClick={() => router.push("/123")}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-ring opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative flex items-center gap-2">
                <Crosshair className="w-4 h-4" />
                Start Mapping
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </span>
            </Button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default LandingPage;
