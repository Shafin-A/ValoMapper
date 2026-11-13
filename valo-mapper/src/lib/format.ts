export const getRelativeTime = (date: Date) => {
  const now = new Date();
  const elapsed = (now.getTime() - date.getTime()) / 1000;

  const intervals = [
    { label: "year", seconds: 31536000 },
    { label: "month", seconds: 2592000 },
    { label: "week", seconds: 604800 },
    { label: "day", seconds: 86400 },
    { label: "hour", seconds: 3600 },
    { label: "minute", seconds: 60 },
    { label: "second", seconds: 1 },
  ];

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  for (const interval of intervals) {
    const count = Math.floor(elapsed / interval.seconds);
    if (count >= 1 || count <= -1) {
      return rtf.format(-count, interval.label as Intl.RelativeTimeFormatUnit);
    }
  }

  return rtf.format(0, "second");
};

export const capitalize = (s: string) =>
  s && String(s[0]).toUpperCase() + String(s).slice(1);
