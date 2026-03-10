const RSO_CONFIG = {
  domain: "https://auth.riotgames.com",
  authorizeUrl: "https://auth.riotgames.com/authorize",
  tokenUrl: "https://auth.riotgames.com/token",
  userinfoUrl: "https://auth.riotgames.com/userinfo",
};

export const getRSOAuthorizationUrl = (
  clientId: string,
  redirectUri: string,
  state?: string,
  prompt: string = "login",
): string => {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid offline_access",
    prompt,
  });

  if (state) {
    params.append("state", state);
  }

  return `${RSO_CONFIG.authorizeUrl}?${params.toString()}`;
};

export const parseRSORedirect = (state?: string): string => {
  if (!state) {
    return "/";
  }

  const prefix = "redirect=";
  if (state.startsWith(prefix)) {
    const encoded = state.slice(prefix.length);
    try {
      return decodeURIComponent(encoded) || "/";
    } catch {
      return "/";
    }
  }

  return "/";
};

export interface RSOExchangeResponse {
  customToken?: string;
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  [key: string]: unknown;
}

export const exchangeCodeForTokens = async (
  code: string,
): Promise<RSOExchangeResponse> => {
  const body = { code };

  const response = await fetch("/api/auth/rso/callback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to exchange code for tokens: ${errText}`);
  }

  return response.json();
};

export const normalizeOrigin = (origin: string): string => {
  // in dev `window.location.origin` is often `http://0.0.0.0:3000` (or with
  // https).  Browsers can't navigate to 0.0.0.0, so replace that segment
  // with "localhost" while preserving any port or scheme.
  if (/^https?:\/\/0\.0\.0\.0/.test(origin)) {
    return origin.replace("0.0.0.0", "localhost");
  }
  return origin;
};

export const generateRSOAuthLink = (
  clientId: string,
  state?: string,
  prompt: string = "login",
): string => {
  const fallbackOrigin = normalizeOrigin(window.location.origin);

  let redirectUri =
    process.env.NEXT_PUBLIC_RSO_REDIRECT_URI ||
    `${fallbackOrigin}/api/auth/rso/callback`;

  // if the URI itself contains 0.0.0.0 (perhaps from a misconfigured env),
  // normalize its origin as well.
  try {
    const parsed = new URL(redirectUri);
    const normalized = normalizeOrigin(parsed.origin);
    if (normalized !== parsed.origin) {
      // no-op
      redirectUri = redirectUri.replace(parsed.origin, normalized);
    }
  } catch {
    // ignore invalid URLs, fallbackUri stays as-is
  }

  return getRSOAuthorizationUrl(clientId, redirectUri, state, prompt);
};
