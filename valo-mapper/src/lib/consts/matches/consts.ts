export type MatchTone = "user" | "blue" | "red";
export type MatchResultTone = "Win" | "Loss";

export const ALL_MATCH_QUEUE_FILTER = "All";
export const DEFAULT_MATCH_QUEUE_FILTER = "Competitive";

export const MATCH_QUEUE_FILTER_OPTIONS = [
  { value: ALL_MATCH_QUEUE_FILTER, label: "All Queues" },
  { value: "Competitive", label: "Competitive" },
  { value: "Unrated", label: "Unrated" },
  { value: "Custom", label: "Custom" },
] as const;

type MatchToneClasses = {
  accentBg: string;
  accentText: string;
  accentBorder: string;
  iconBg: string;
  identityBg: string;
  scoreBg: string;
  contentBg: string;
};

type MatchResultClasses = {
  accentBg: string;
  accentText: string;
  cardOverlay: string;
};

export const MATCH_TONE_CLASSES: Record<MatchTone, MatchToneClasses> = {
  user: {
    accentBg: "bg-[#facc15]",
    accentText: "text-[#facc15]",
    accentBorder: "border-[#facc15]",
    iconBg: "bg-[#6a5817]",
    identityBg: "bg-[#998c6180]",
    scoreBg: "bg-[#665d4080]",
    contentBg: "bg-[#584f3680]",
  },
  blue: {
    accentBg: "bg-[#42EEC7]",
    accentText: "text-[#42EEC7]",
    accentBorder: "border-[#42EEC7]",
    iconBg: "bg-[#19ac92]",
    identityBg: "bg-[#19ac9280]",
    scoreBg: "bg-[#21999980]",
    contentBg: "bg-[#19767480]",
  },
  red: {
    accentBg: "bg-[#FF4655]",
    accentText: "text-[#FF4655]",
    accentBorder: "border-[#FF4655]",
    iconBg: "bg-[#c65063]",
    identityBg: "bg-[#c6506380]",
    scoreBg: "bg-[#a0415080]",
    contentBg: "bg-[#3f2d3f80]",
  },
};

export const MATCH_RESULT_CLASSES: Record<MatchResultTone, MatchResultClasses> =
  {
    Win: {
      accentBg: MATCH_TONE_CLASSES.blue.accentBg,
      accentText: MATCH_TONE_CLASSES.blue.accentText,
      cardOverlay:
        "bg-linear-to-r from-[#133b43]/72 via-[#124c58]/58 to-transparent",
    },
    Loss: {
      accentBg: MATCH_TONE_CLASSES.red.accentBg,
      accentText: MATCH_TONE_CLASSES.red.accentText,
      cardOverlay:
        "bg-linear-to-r from-[#3a1f33]/72 via-[#2b2240]/58 to-transparent",
    },
  };

export const MATCH_PAGE_CLASSES = {
  bestRoundText: "text-amber-100",
  cardBackground: "bg-[#10243a]/50",
  roundSelectorSelected:
    "border-2 border-[#42EEC7] bg-linear-to-t from-[#42EEC7]/48 via-[#42EEC7]/24 to-transparent text-[#42EEC7]",
  roundSelectorIdle:
    "bg-slate-900/45 text-slate-300 hover:border-2 hover:border-[#42EEC7]",
} as const;

export const getMatchTone = (
  teamId?: string,
  isCurrentPlayer = false,
): MatchTone => {
  if (isCurrentPlayer) {
    return "user";
  }

  return teamId === "Blue" ? "blue" : "red";
};

export const getMatchResultTone = (hasWon: boolean): MatchResultTone => {
  return hasWon ? "Win" : "Loss";
};
