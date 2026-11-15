import {
  clearStateCookieHeader,
  setCodeBindingCookie,
  validateCodeBindingFromRequest,
  validateStateFromRequest,
} from "../start/route";

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const validationResult = validateStateFromRequest(request, state);

  let redirectPath = "/auth/rso-callback";
  const params = new URLSearchParams();
  if (!validationResult.isValid) {
    params.set("error", "invalid_state");
  } else {
    if (code) {
      params.set("code", code);
    }
    if (validationResult.redirectPath) {
      params.set("redirect", validationResult.redirectPath);
    }
  }
  const query = params.toString();
  if (query) redirectPath += `?${query}`;

  // Keep this relative to avoid bad internal hosts (e.g. 0.0.0.0 on Fly).
  const res = new Response(null, {
    status: 307,
    headers: {
      Location: redirectPath,
    },
  });

  type RedirectTestResponse = Response & { redirectPath?: string };
  const responseForTests = res as RedirectTestResponse;
  responseForTests.redirectPath = redirectPath;

  clearStateCookieHeader(responseForTests);
  if (validationResult.isValid && code) {
    setCodeBindingCookie(responseForTests, code);
  }
  return responseForTests;
};

const forwardCodeExchange = async (code: string): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${process.env.API_URL}/auth/rso/callback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json();
      return Response.json(error, { status: response.status });
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      return Response.json(
        { error: "Request timed out. Please try again." },
        { status: 504 },
      );
    }
    throw error;
  }
};

export const POST = async (request: Request) => {
  let body: { code?: unknown } | null = null;
  try {
    body = (await request.json()) as { code?: unknown } | null;
  } catch {
    body = null;
  }

  const code = typeof body?.code === "string" ? body.code.trim() : "";

  if (!code) {
    return Response.json({ error: "No authorization code" }, { status: 400 });
  }

  if (!validateCodeBindingFromRequest(request, code)) {
    return Response.json(
      { error: "Riot sign-in expired. Please start the sign-in again." },
      { status: 401 },
    );
  }

  return forwardCodeExchange(code);
};
