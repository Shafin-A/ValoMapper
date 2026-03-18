const API_PREFIX = "/api";

export const buildBackendUrl = (requestPath: string): string | null => {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) return null;

  const base = apiUrl.replace(/\/+$/, "");
  const path = requestPath.startsWith("/") ? requestPath : `/${requestPath}`;

  if (base.endsWith(API_PREFIX) && path.startsWith(`${API_PREFIX}/`)) {
    return `${base}${path.slice(API_PREFIX.length)}`;
  }

  return `${base}${path}`;
};
