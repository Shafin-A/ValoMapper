export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const parseErrorMessage = async (
  response: Response,
  fallbackMessage: string,
): Promise<string> => {
  try {
    const data = await response.json();
    return data.error || data.message || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
};

interface FetchOptions extends Omit<RequestInit, "headers"> {
  token?: string | null;
}

export const apiFetch = async <T>(
  url: string,
  options: FetchOptions = {},
): Promise<T> => {
  const { token, ...fetchOptions } = options;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const message = await parseErrorMessage(
      response,
      `Request failed: ${response.statusText}`,
    );
    throw new ApiError(message, response.status, response.statusText);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json();
};

export const DEFAULT_RETRY_CONFIG = {
  retry: (failureCount: number, error: Error) => {
    if (
      error instanceof ApiError &&
      error.status >= 400 &&
      error.status < 500
    ) {
      return false;
    }
    return failureCount < 3;
  },
  retryDelay: (attemptIndex: number) =>
    Math.min(1000 * 2 ** attemptIndex, 5000),
} as const;

export const authQueryOptions = {
  ...DEFAULT_RETRY_CONFIG,
  staleTime: 1000 * 60 * 5, // 5 minutes
} as const;
