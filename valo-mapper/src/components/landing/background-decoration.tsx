"use client";

import Image from "next/image";
import React from "react";

interface FloatingAssetProps {
  src: string;
  width: number;
  height: number;
  className: string;
  rotation?: number;
  animation: string;
  animationDelay?: string;
  flipX?: boolean;
}

const FloatingAsset = ({
  src,
  width,
  height,
  className,
  rotation = 0,
  animation,
  animationDelay,
  flipX = false,
}: FloatingAssetProps) => (
  <div
    className={`absolute will-change-transform ${className}`}
    style={
      {
        animation,
        animationDelay,
        "--rotation": `${rotation}deg`,
      } as React.CSSProperties
    }
  >
    <Image
      src={src}
      alt=""
      width={width}
      height={height}
      draggable={false}
      className={`h-auto w-full select-none ${flipX ? "-scale-x-100" : ""}`}
    />
  </div>
);

export const BackgroundDecoration = () => {
  return (
    <div
      aria-hidden
      className="landing-decor pointer-events-none absolute inset-0 select-none overflow-hidden"
    >
      {/* Faint Ascent minimap anchoring the composition */}
      <div
        className="absolute left-1/2 top-1/2 w-[92vw] max-w-[760px] opacity-[0.08]"
        style={{
          transform: "translate(-50%, -50%) rotate(-6deg)",
          maskImage: "radial-gradient(circle, black 30%, transparent 72%)",
          WebkitMaskImage:
            "radial-gradient(circle, black 30%, transparent 72%)",
        }}
      >
        <Image
          src="/maps/minimaps/ascent.webp"
          alt=""
          width={2048}
          height={2048}
          loading="eager"
          sizes="(max-width: 826px) 92vw, 760px"
          draggable={false}
          className="h-auto w-full select-none"
        />
      </div>

      {/* Soft brand glow behind the hero copy */}
      <div
        className="absolute left-1/2 top-1/2 aspect-square w-[120vw] max-w-[1100px] -translate-x-1/2 -translate-y-1/2 blur-2xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--ring) 22%, transparent) 0%, transparent 62%)",
        }}
      />

      {/* Vandal sweeping in from the top left */}
      <FloatingAsset
        src="/tools/vandal.webp"
        width={420}
        height={128}
        className="-left-[20%] top-[6%] w-[62vw] max-w-[680px] opacity-[0.16] sm:-left-[12%] sm:top-[10%]"
        rotation={-10}
        animation="float 12s ease-in-out infinite"
        flipX
      />

      {/* Phantom sweeping in from the bottom right */}
      <FloatingAsset
        src="/tools/phantom.webp"
        width={508}
        height={120}
        className="-right-[18%] bottom-[6%] w-[64vw] max-w-[720px] opacity-[0.14] sm:-right-[10%] sm:bottom-[10%]"
        rotation={8}
        animation="float 14s ease-in-out infinite"
        animationDelay="-4s"
      />

      {/* Operator sweeping in from the top right */}
      <FloatingAsset
        src="/tools/operator.webp"
        width={504}
        height={104}
        className="-right-[8%] top-[16%] w-[54vw] max-w-[560px] opacity-[0.13] sm:-right-[3%] sm:top-[20%]"
        rotation={-6}
        animation="float 11s ease-in-out infinite"
        animationDelay="-2s"
      />

      {/* The Spike, gently rocking with a pulsing green charge */}
      <div
        className="absolute bottom-[12%] left-[6%] w-[12vw] max-w-[104px] opacity-25 will-change-transform sm:bottom-[16%] sm:left-[8%]"
        style={{ animation: "spike-rock 6s ease-in-out infinite" }}
      >
        <div style={{ animation: "spike-glow 4s ease-in-out infinite" }}>
          <Image
            src="/tools/spike.webp"
            alt=""
            width={128}
            height={128}
            draggable={false}
            className="h-auto w-full select-none"
          />
        </div>
      </div>
    </div>
  );
};
