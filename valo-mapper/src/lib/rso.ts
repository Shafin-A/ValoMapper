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
      return sanitizeRedirectPath(decodeURIComponent(encoded));
    } catch {
      return "/";
    }
  }

  return "/";
};

export const sanitizeRedirectPath = (input?: string | null): string => {
  if (!input) {
    return "/";
  }

  const value = input.trim();

  if (!value.startsWith("/")) {
    return "/";
  }

  if (value.startsWith("//")) {
    return "/";
  }

  if (value.includes("\\") || /[\r\n]/.test(value)) {
    return "/";
  }

  return value;
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
  // Browsers cannot navigate to 0.0.0.0, which dev origins often use.
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

  // A configured redirect URI may also carry a 0.0.0.0 origin.
  try {
    const parsed = new URL(redirectUri);
    const normalized = normalizeOrigin(parsed.origin);
    if (normalized !== parsed.origin) {
      redirectUri = redirectUri.replace(parsed.origin, normalized);
    }
  } catch {
    // Invalid URL: keep the configured value.
  }

  return getRSOAuthorizationUrl(clientId, redirectUri, state, prompt);
};
