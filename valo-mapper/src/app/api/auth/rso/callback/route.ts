import {
  clearStateCookieHeader,
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
  return responseForTests;
};

export const POST = async (request: Request) => {
  const body = await request.json();

  if (!body) {
    return Response.json({ error: "No request body" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${process.env.API_URL}/auth/rso/callback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
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
