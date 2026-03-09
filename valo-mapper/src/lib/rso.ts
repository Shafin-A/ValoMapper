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
): string => {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid offline_access",
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

  const response = await fetch("/api/auth/rso-callback", {
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

export const generateRSOAuthLink = (
  clientId: string,
  state?: string,
): string => {
  const redirectUri =
    process.env.NEXT_PUBLIC_RSO_REDIRECT_URI ||
    `${window.location.origin}/api/auth/rso-callback`;

  return getRSOAuthorizationUrl(clientId, redirectUri, state);
};
