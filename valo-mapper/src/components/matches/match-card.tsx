import { MATCH_PAGE_CLASSES, MATCH_RESULT_CLASSES } from "@/lib/consts";
import {
  getAgentImageSrc,
  getMapImageSrc,
  getResultLabel,
} from "@/lib/matches";
import { MatchPreview } from "@/lib/types";
import Image from "next/image";

interface MatchCardProps {
  match: MatchPreview;
  onToggle: () => void;
}

export const MatchCard = ({ match, onToggle }: MatchCardProps) => {
  const resultTone = match.result === "Win" ? "Win" : "Loss";
  const resultClasses = MATCH_RESULT_CLASSES[resultTone];

  return (
    <article
      onClick={onToggle}
      className={`relative isolate mb-1.5 h-[108px] cursor-pointer overflow-hidden ${MATCH_PAGE_CLASSES.cardBackground} backdrop-blur-[1px] sm:h-28`}
    >
      <div
        className={`absolute left-0 top-0 z-40 h-full w-1 ${resultClasses.accentBg}`}
      />

      <div
        className="absolute inset-y-0 right-0 w-[46%]"
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 28%, rgba(0,0,0,0.55) 52%, black 78%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 28%, rgba(0,0,0,0.55) 52%, black 78%)",
        }}
      >
        <Image
          src={getMapImageSrc(match.mapName)}
          alt={match.mapName}
          fill
          sizes="(max-width: 640px) 85vw, (max-width: 1024px) 50vw, 46vw"
          loading="eager"
          className="object-cover object-center"
        />
      </div>

      <div
        className={`absolute inset-y-0 left-0 w-full ${resultClasses.cardOverlay}`}
      />

      <div className="relative z-30 flex h-full items-center pl-1">
        <div className="relative aspect-square h-full shrink-0">
          <Image
            src={getAgentImageSrc(match.agentName)}
            alt={match.agentName || "Agent"}
            fill
            sizes="(min-width: 640px) 96px, 84px"
            className="object-contain"
          />
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-1.5 px-1.5 pr-[36%] sm:gap-2 sm:px-3 sm:pr-[35%] lg:gap-3 lg:px-5 lg:pr-[30%]">
          <div className="min-w-0">
            <div className="grid grid-cols-[auto_auto] items-baseline gap-x-1.5 gap-y-1.5 sm:grid-cols-[auto_1fr] sm:gap-x-2">
              <span className="whitespace-nowrap text-[11px] font-semibold uppercase leading-none tracking-[0.05em] text-white sm:text-[18px] lg:text-[28px]">
                KDA
              </span>
              <span className="whitespace-nowrap text-[11px] font-semibold uppercase leading-none tracking-[0.04em] text-white sm:text-[18px] lg:text-[28px]">
                {match.kills} / {match.deaths} / {match.assists}
              </span>
              <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.05em] text-white/55 sm:text-[12px] lg:text-[16px]">
                SCORE
              </span>
              <span className="whitespace-nowrap text-[10px] font-semibold uppercase leading-none tracking-[0.05em] text-white sm:text-[12px] lg:text-[16px]">
                {match.personalScore}
              </span>
            </div>
          </div>
        </div>

        <div className="absolute right-1 top-1/2 z-40 w-[34%] -translate-y-1/2 text-right sm:right-2 sm:w-[32%] lg:left-1/2 lg:right-auto lg:w-[30%] lg:-translate-x-1/2 lg:text-center">
          <p
            className={`text-[16px] font-semibold uppercase leading-none tracking-[0.04em] sm:text-[24px] lg:text-[36px] ${resultClasses.accentText}`}
          >
            {getResultLabel(match.result)}
          </p>
          <p className="mt-0.5 text-[20px] font-semibold leading-none tracking-[0.03em] text-white sm:mt-1 sm:text-[24px] lg:mt-2 lg:text-[32px]">
            <span
              className={
                resultTone === "Win" ? MATCH_RESULT_CLASSES.Win.accentText : ""
              }
            >
              {match.teamScore}
            </span>
            {" - "}
            <span
              className={
                resultTone === "Loss"
                  ? MATCH_RESULT_CLASSES.Loss.accentText
                  : ""
              }
            >
              {match.enemyScore}
            </span>
          </p>
        </div>
      </div>
    </article>
  );
};
