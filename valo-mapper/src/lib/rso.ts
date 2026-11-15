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
    const payload = (await response.json().catch(() => null)) as {
      error?: unknown;
    } | null;
    throw new Error(
      typeof payload?.error === "string"
        ? payload.error
        : `Failed to exchange code for tokens (${response.status})`,
    );
  }

  return response.json();
};
