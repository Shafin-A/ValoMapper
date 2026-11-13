export type SecurityHeader = {
  key: string;
  value: string;
};

type SecurityHeaderOptions = {
  isDevelopment?: boolean;
  apiUrl?: string;
  wsUrl?: string;
};

const TIGRIS_ORIGIN = "https://fly.storage.tigris.dev";

const FIREBASE_CONNECT_SOURCES = [
  "https://*.googleapis.com",
  "https://*.firebaseapp.com",
];

const FRAME_SOURCES = [
  "'self'",
  "https://www.youtube.com",
  "https://www.youtube-nocookie.com",
  "https://*.firebaseapp.com",
];

const getOrigin = (value: string | undefined): string | null => {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const buildContentSecurityPolicy = ({
  isDevelopment = false,
  apiUrl,
  wsUrl,
}: SecurityHeaderOptions): string => {
  const connectSources = new Set(["'self'", ...FIREBASE_CONNECT_SOURCES]);

  for (const origin of [getOrigin(apiUrl), getOrigin(wsUrl)]) {
    if (origin) connectSources.add(origin);
  }

  if (isDevelopment) {
    connectSources.add("ws:");
  }

  const scriptSources = ["'self'", "'unsafe-inline'"];
  if (isDevelopment) scriptSources.push("'unsafe-eval'");

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${TIGRIS_ORIGIN}`,
    "font-src 'self' data:",
    `connect-src ${[...connectSources].join(" ")}`,
    `frame-src ${FRAME_SOURCES.join(" ")}`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ];

  if (!isDevelopment) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
};

export const buildSecurityHeaders = (
  options: SecurityHeaderOptions = {},
): SecurityHeader[] => {
  return [
    {
      key: "X-DNS-Prefetch-Control",
      value: "on",
    },
    {
      key: "X-Frame-Options",
      value: "SAMEORIGIN",
    },
    {
      key: "X-Content-Type-Options",
      value: "nosniff",
    },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=()",
    },
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(options),
    },
  ];
};
