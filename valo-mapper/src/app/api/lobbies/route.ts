import { proxyToBackend } from "@/lib/api-proxy";

const COLD_START_RETRY_DELAY_MS = 250;

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const shouldRetryCreateLobby = (response: Response): boolean =>
  response.status === 500 || response.status === 503;

export const POST = async (request: Request) => {
  const body = await request.json().catch(() => undefined);

  const createLobby = () =>
    proxyToBackend("/lobbies", {
      method: "POST",
      ...(body !== undefined ? { body } : {}),
      errorMessage: "Failed to create lobby",
      request,
    });

  const firstResponse = await createLobby();

  if (shouldRetryCreateLobby(firstResponse)) {
    await wait(COLD_START_RETRY_DELAY_MS);
    return createLobby();
  }

  return firstResponse;
};
