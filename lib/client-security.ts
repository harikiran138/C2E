export function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const target = `${encodeURIComponent(name)}=`;
  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(target));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.slice(target.length));
}

export function buildMutationHeaders(
  headers?: HeadersInit,
): Record<string, string> {
  const resolved: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      resolved[key] = value;
    });
  } else if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      resolved[key] = value;
    }
  } else if (headers) {
    Object.assign(resolved, headers);
  }

  const csrfToken = getCookieValue("c2e_csrf_token");
  if (csrfToken) {
    resolved["x-csrf-token"] = csrfToken;
  }

  return resolved;
}
