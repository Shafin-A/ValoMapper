// The API route receives the authorization code from the client page and
// forwards it to the backend service.  In addition, we now support GET
// requests so that we can accept the OAuth redirect URI that **must** point
// at `/api/auth/rso/callback`.  The provider will perform a GET with
// `?code=...`, so we simply redirect that to the client page above.

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  // preserve query parameters when redirecting to the real page
  let redirectPath = "/auth/rso-callback";
  const params = new URLSearchParams();
  if (code) params.set("code", code);
  if (state) params.set("state", state);
  const query = params.toString();
  if (query) redirectPath += `?${query}`;

  const abs = new URL(redirectPath, request.url);
  // build a raw Response so that Location header is available in tests
  const res = new Response(null, {
    status: 307,
    headers: {
      Location: abs.toString(),
    },
  });
  // attach computed redirect for verification in unit tests
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (res as any).redirectPath = abs.toString();
  return res;
};

export const POST = async (request: Request) => {
  const body = await request.json();

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
