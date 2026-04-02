function normalizeBaseUrl(rawUrl?: string | null) {
  const trimmed = rawUrl?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/$/, "");
}

export function resolvePythonBackendUrl(pathname: string) {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;

  const configuredBase = normalizeBaseUrl(
    process.env.AI_API_URL_INTERNAL ||
      process.env.AI_API_URL ||
      process.env.PYTHON_BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL,
  );

  if (configuredBase) {
    return `${configuredBase}${normalizedPath}`;
  }

  if (process.env.NODE_ENV !== "production") {
    return `http://127.0.0.1:8001${normalizedPath}`;
  }

  return null;
}
