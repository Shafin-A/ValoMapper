import { sanitizeRedirectPath } from "@/lib/rso";
import {
  GET as callbackGET,
  POST as callbackPOST,
} from "@/app/api/auth/rso/callback/route";
import { GET as startGET } from "@/app/api/auth/rso/start/route";
import { createHash } from "crypto";

const sha256 = (value: string): string =>
  createHash("sha256").update(value, "utf8").digest("hex");

const OriginalResponse = global.Response;

beforeAll(() => {
  const BaseResponse = OriginalResponse as unknown as {
    new (
      body?: string | null,
      init?: {
        status?: number;
        statusText?: string;
        headers?: Record<string, string>;
      },
    ): {
      headers: Map<string, string> | { get: (name: string) => string | null };
    };
    json?: (data: unknown, init?: { status?: number }) => unknown;
  };

  class PatchedResponse extends BaseResponse {
    constructor(
      body?: string | null,
      init?: {
        status?: number;
        statusText?: string;
        headers?: Record<string, string>;
      },
    ) {
      super(body, init);

      const headerMap = this.headers instanceof Map ? this.headers : new Map();
      if (init?.headers) {
        Object.entries(init.headers).forEach(([name, value]) => {
          headerMap.set(name, value);
        });
      }

      this.headers = {
        append: (name: string, value: string) => {
          headerMap.set(name, value);
        },
        set: (name: string, value: string) => {
          headerMap.set(name, value);
        },
        get: (name: string) => headerMap.get(name) || null,
      } as unknown as Map<string, string>;
    }

    static redirect(url: string | URL, status: number = 302) {
      const response = new PatchedResponse(null, { status });
      (
        response.headers as unknown as {
          set: (name: string, value: string) => void;
        }
      ).set("Location", String(url));
      return response;
    }
  }

  if (BaseResponse.json) {
    (PatchedResponse as unknown as { json: typeof BaseResponse.json }).json =
      BaseResponse.json;
  }

  global.Response = PatchedResponse as unknown as typeof Response;
});

afterAll(() => {
  global.Response = OriginalResponse;
});

describe("sanitizeRedirectPath", () => {
  test("keeps relative paths and rejects absolute ones", () => {
    expect(sanitizeRedirectPath("https://evil.test")).toBe("/");
    expect(sanitizeRedirectPath("//evil.test")).toBe("/");
    expect(sanitizeRedirectPath("\\evil")).toBe("/");
    expect(sanitizeRedirectPath("/safe/path")).toBe("/safe/path");
  });
});

describe("/api/auth/rso/callback route", () => {
  const buildStateCookie = (nonce: string, redirectPath: string): string => {
    const payload = Buffer.from(
      JSON.stringify({ nonce, redirectPath }),
      "utf8",
    ).toString("base64url");
    return `rso_oauth_state=${payload}`;
  };

  it("GET should reject callback when oauth state is invalid", async () => {
    const req = new Request(
      "https://example.com/api/auth/rso/callback?code=abc123&state=xyz",
    );
    const res = await callbackGET(req as Request);
    expect(res.status).toBe(307);
    const redirectPath = (res as Response & { redirectPath?: string })
      .redirectPath;
    expect(redirectPath).toBe("/auth/rso-callback?error=invalid_state");
    expect(res.headers.get("Set-Cookie")).toContain("rso_oauth_state=");
    expect(res.headers.get("Set-Cookie")).toContain("Max-Age=0");
  });

  it("GET should redirect with code and safe redirect when oauth state is valid", async () => {
    const req = new Request(
      "https://example.com/api/auth/rso/callback?code=abc123&state=xyz",
      {
        headers: {
          cookie: buildStateCookie("xyz", "/profile"),
        },
      },
    );

    const res = await callbackGET(req as Request);
    expect(res.status).toBe(307);
    const redirectPath = (res as Response & { redirectPath?: string })
      .redirectPath;
    expect(redirectPath).toBe(
      "/auth/rso-callback?code=abc123&redirect=%2Fprofile",
    );
  });

  it("GET should bind the code to the browser when oauth state is valid", async () => {
    const req = new Request(
      "https://example.com/api/auth/rso/callback?code=abc123&state=xyz",
      {
        headers: {
          cookie: buildStateCookie("xyz", "/profile"),
        },
      },
    );

    const res = await callbackGET(req as Request);
    const setCookie = res.headers.get("Set-Cookie") ?? "";

    expect(setCookie).toContain("rso_code_binding=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Path=/api/auth/rso/callback");

    const cookieValue = setCookie.split(";")[0].split("=").slice(1).join("=");
    expect(cookieValue).toBe(sha256("abc123"));
  });

  it("GET should not bind a code when oauth state is invalid", async () => {
    const req = new Request(
      "https://example.com/api/auth/rso/callback?code=abc123&state=xyz",
    );

    const res = await callbackGET(req as Request);
    expect(res.headers.get("Set-Cookie") ?? "").not.toContain(
      "rso_code_binding=",
    );
  });
});

describe("/api/auth/rso/callback POST route", () => {
  const originalFetch = global.fetch;
  const originalApiUrl = process.env.API_URL;
  let mockFetch: jest.Mock;

  const buildBindingCookie = (code: string): string =>
    `rso_code_binding=${sha256(code)}`;

  const buildRequest = (body: unknown, cookie?: string): Request =>
    new Request("https://example.com/api/auth/rso/callback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
    }) as Request;

  beforeEach(() => {
    process.env.API_URL = "https://api.test/api";
    mockFetch = jest.fn();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalApiUrl === undefined) {
      delete process.env.API_URL;
    } else {
      process.env.API_URL = originalApiUrl;
    }
  });

  it("rejects a code that did not come through the validated callback", async () => {
    const res = await callbackPOST(
      buildRequest({ code: "attacker-code" }) as Request,
    );

    expect(res.status).toBe(401);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("rejects a code that does not match the binding cookie", async () => {
    const res = await callbackPOST(
      buildRequest(
        { code: "attacker-code" },
        buildBindingCookie("some-other-code"),
      ) as Request,
    );

    expect(res.status).toBe(401);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("forwards the code when the binding cookie matches", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ customToken: "token-123" }),
    });

    const res = await callbackPOST(
      buildRequest({ code: "code-123" }, buildBindingCookie("code-123")),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ customToken: "token-123" });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.test/api/auth/rso/callback");
    expect(JSON.parse(init.body)).toEqual({ code: "code-123" });
  });

  it("rejects a request without a code", async () => {
    const res = await callbackPOST(
      buildRequest({}, buildBindingCookie("code-123")) as Request,
    );

    expect(res.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("/api/auth/rso/start route", () => {
  const originalClientId = process.env.NEXT_PUBLIC_RSO_CLIENT_ID;
  const originalRedirectUri = process.env.NEXT_PUBLIC_RSO_REDIRECT_URI;

  afterEach(() => {
    if (originalClientId === undefined) {
      delete process.env.NEXT_PUBLIC_RSO_CLIENT_ID;
    } else {
      process.env.NEXT_PUBLIC_RSO_CLIENT_ID = originalClientId;
    }

    if (originalRedirectUri === undefined) {
      delete process.env.NEXT_PUBLIC_RSO_REDIRECT_URI;
    } else {
      process.env.NEXT_PUBLIC_RSO_REDIRECT_URI = originalRedirectUri;
    }
  });

  it("GET should redirect to login error when rso client id is missing", async () => {
    delete process.env.NEXT_PUBLIC_RSO_CLIENT_ID;

    const req = new Request(
      "https://example.com/api/auth/rso/start?redirect=%2Fstrategies",
    );
    const res = await startGET(req as Request);

    expect(res.status).toBe(307);
    expect(res.headers.get("Location")).toBe(
      "https://example.com/login?error=rso_not_configured",
    );
  });

  it("GET should set oauth state cookie and redirect to riot authorize", async () => {
    process.env.NEXT_PUBLIC_RSO_CLIENT_ID = "client-123";
    delete process.env.NEXT_PUBLIC_RSO_REDIRECT_URI;

    const req = new Request(
      "https://example.com/api/auth/rso/start?redirect=%2Fstrategies",
    );
    const res = await startGET(req as Request);

    expect(res.status).toBe(307);

    const locationHeader = res.headers.get("Location");
    expect(locationHeader).toContain("https://auth.riotgames.com/authorize?");

    const redirect = new URL(locationHeader as string);
    expect(redirect.searchParams.get("client_id")).toBe("client-123");
    expect(redirect.searchParams.get("response_type")).toBe("code");
    expect(redirect.searchParams.get("scope")).toBe("openid offline_access");
    expect(redirect.searchParams.get("redirect_uri")).toBe(
      "https://example.com/api/auth/rso/callback",
    );

    const stateParam = redirect.searchParams.get("state");
    expect(stateParam).toBeTruthy();

    const setCookie = res.headers.get("Set-Cookie");
    expect(setCookie).toContain("rso_oauth_state=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");

    const encodedPayload =
      setCookie?.split(";")[0].split("=").slice(1).join("=") || "";
    const cookiePayload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as { nonce?: string; redirectPath?: string };

    expect(cookiePayload.nonce).toBe(stateParam);
    expect(cookiePayload.redirectPath).toBe("/strategies");
  });
});
