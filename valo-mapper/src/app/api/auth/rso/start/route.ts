import { createHash, randomBytes, timingSafeEqual } from "crypto";

const RSO_AUTHORIZE_URL = "https://auth.riotgames.com/authorize";
const STATE_COOKIE = "rso_oauth_state";
const STATE_COOKIE_MAX_AGE_SECONDS = 10 * 60;
const CODE_BINDING_COOKIE = "rso_code_binding";
const CODE_BINDING_MAX_AGE_SECONDS = 5 * 60;

interface OAuthStateCookie {
  nonce: string;
  redirectPath: string;
}

const normalizeOrigin = (origin: string): string => {
  if (/^https?:\/\/0\.0\.0\.0/.test(origin)) {
    return origin.replace("0.0.0.0", "localhost");
  }
  return origin;
};

const sanitizeRedirectPath = (redirect: string | null): string => {
  if (!redirect) {
    return "/";
  }

  try {
    const decoded = decodeURIComponent(redirect).trim();
    if (!decoded.startsWith("/")) {
      return "/";
    }

    if (decoded.startsWith("//")) {
      return "/";
    }

    if (decoded.includes("\\") || /[\r\n]/.test(decoded)) {
      return "/";
    }

    return decoded;
  } catch {
    return "/";
  }
};

const encodeStateCookie = (value: OAuthStateCookie): string => {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
};

const decodeStateCookie = (
  value: string | undefined,
): OAuthStateCookie | null => {
  if (!value) {
    return null;
  }

  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as OAuthStateCookie;
    if (!parsed?.nonce || !parsed?.redirectPath) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

const clearStateCookie = (response: Response): void => {
  response.headers.append(
    "Set-Cookie",
    `${STATE_COOKIE}=; Path=/api/auth/rso/callback; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
};

const buildSetCookie = (
  name: string,
  value: string,
  maxAgeSeconds: number,
): string => {
  const parts = [
    `${name}=${value}`,
    "Path=/api/auth/rso/callback",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ];

  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }

  return parts.join("; ");
};

const setStateCookie = (
  response: Response,
  stateCookie: OAuthStateCookie,
): void => {
  response.headers.append(
    "Set-Cookie",
    buildSetCookie(
      STATE_COOKIE,
      encodeStateCookie(stateCookie),
      STATE_COOKIE_MAX_AGE_SECONDS,
    ),
  );
};

const buildAuthorizeURL = (
  clientId: string,
  redirectUri: string,
  state: string,
): URL => {
  const url = new URL(RSO_AUTHORIZE_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid offline_access");
  url.searchParams.set("prompt", "login");
  url.searchParams.set("state", state);
  return url;
};

const createRedirectResponse = (location: string): Response => {
  return new Response(null, {
    status: 307,
    headers: {
      Location: location,
    },
  });
};

export const GET = async (request: Request) => {
  const requestURL = new URL(request.url);
  const redirectPath = sanitizeRedirectPath(
    requestURL.searchParams.get("redirect"),
  );
  const clientId = process.env.NEXT_PUBLIC_RSO_CLIENT_ID;

  if (!clientId) {
    const loginURL = new URL("/login?error=rso_not_configured", requestURL);
    return createRedirectResponse(loginURL.toString());
  }

  const callbackUri =
    process.env.NEXT_PUBLIC_RSO_REDIRECT_URI ||
    `${normalizeOrigin(requestURL.origin)}/api/auth/rso/callback`;

  const nonce = randomBytes(24).toString("hex");
  const authorizeURL = buildAuthorizeURL(clientId, callbackUri, nonce);
  const response = createRedirectResponse(authorizeURL.toString());

  setStateCookie(response, { nonce, redirectPath });
  return response;
};

const parseCookieValue = (
  cookieHeader: string,
  cookieName: string,
): string | undefined => {
  const items = cookieHeader.split(";");
  for (const item of items) {
    const [name, ...rest] = item.trim().split("=");
    if (name === cookieName) {
      return rest.join("=");
    }
  }

  return undefined;
};

export const validateStateFromRequest = (
  request: Request,
  state: string | null,
): { isValid: boolean; redirectPath: string } => {
  const cookieHeader = request.headers.get("cookie") || "";
  const stateCookieRaw = parseCookieValue(cookieHeader, STATE_COOKIE);
  const parsedStateCookie = decodeStateCookie(stateCookieRaw);

  if (!state || !parsedStateCookie?.nonce) {
    return { isValid: false, redirectPath: "/" };
  }

  const expected = Buffer.from(parsedStateCookie.nonce, "utf8");
  const actual = Buffer.from(state, "utf8");

  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return { isValid: false, redirectPath: "/" };
  }

  return {
    isValid: true,
    redirectPath: sanitizeRedirectPath(parsedStateCookie.redirectPath),
  };
};

export const clearStateCookieHeader = clearStateCookie;

const hashCode = (code: string): string =>
  createHash("sha256").update(code, "utf8").digest("hex");

// Binds a Riot authorization code to the browser that completed the state check,
// so a bare /auth/rso-callback?code= link cannot exchange someone else's code.
export const setCodeBindingCookie = (
  response: Response,
  code: string,
): void => {
  response.headers.append(
    "Set-Cookie",
    buildSetCookie(
      CODE_BINDING_COOKIE,
      hashCode(code),
      CODE_BINDING_MAX_AGE_SECONDS,
    ),
  );
};

export const validateCodeBindingFromRequest = (
  request: Request,
  code: string,
): boolean => {
  const cookieValue = parseCookieValue(
    request.headers.get("cookie") || "",
    CODE_BINDING_COOKIE,
  );

  if (!cookieValue || !code) {
    return false;
  }

  const expected = Buffer.from(cookieValue, "utf8");
  const actual = Buffer.from(hashCode(code), "utf8");

  return expected.length === actual.length && timingSafeEqual(expected, actual);
};
