import {
  buildSecurityHeaders,
  type SecurityHeader,
} from "@/lib/security-headers";

const getHeader = (headers: SecurityHeader[], key: string): string => {
  return headers.find((header) => header.key === key)?.value ?? "";
};

describe("security headers", () => {
  it("builds a production CSP with app and third-party origins", () => {
    const headers = buildSecurityHeaders({
      isDevelopment: false,
      apiUrl: "https://api.valomapper.com/api",
      wsUrl: "wss://api.valomapper.com",
    });

    const csp = getHeader(headers, "Content-Security-Policy");

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("https://api.valomapper.com");
    expect(csp).toContain("wss://api.valomapper.com");
    expect(csp).toContain("https://*.googleapis.com");
    expect(csp).toContain("https://*.firebaseapp.com");
    expect(csp).toContain(
      "img-src 'self' data: blob: https://fly.storage.tigris.dev",
    );
    expect(csp).toContain("frame-src 'self' https://www.youtube.com");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain("upgrade-insecure-requests");
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it("allows eval and websocket connections in development", () => {
    const csp = getHeader(
      buildSecurityHeaders({ isDevelopment: true }),
      "Content-Security-Policy",
    );

    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("ws:");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });

  it("ignores malformed URLs instead of emitting invalid sources", () => {
    const csp = getHeader(
      buildSecurityHeaders({ apiUrl: "not a url", wsUrl: "" }),
      "Content-Security-Policy",
    );

    expect(csp).not.toContain("not a url");
    expect(csp).toContain("connect-src 'self'");
  });

  it("keeps the baseline hardening headers", () => {
    const headers = buildSecurityHeaders();

    expect(headers).toEqual(
      expect.arrayContaining([
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
      ]),
    );
  });
});
