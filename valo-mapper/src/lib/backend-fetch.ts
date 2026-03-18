import { buildBackendUrl } from "./backend-url";

export interface BackendFetchOptions {
  method: string;
  headers?: Record<string, string>;
  body?: BodyInit;
  signal?: AbortSignal;
}

export const fetchBackendWithTimeout = async (
  path: string,
  options: BackendFetchOptions,
  timeoutMs: number = 30000,
): Promise<Response> => {
  const backendUrl = buildBackendUrl(path);
  if (!backendUrl) {
    throw new Error("API_URL is not configured");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(backendUrl, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};
