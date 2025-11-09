"use client";

import { Crosshair } from "lucide-react";
import React from "react";

export const BackgroundDecoration = () => {
  return (
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
          } as React.CSSProperties
        }
      />
    </div>
  );
};
