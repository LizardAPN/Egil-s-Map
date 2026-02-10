const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** Treats null, undefined, "null", "undefined", and empty string as invalid. */
export function isValidToken(token: string | undefined | null): token is string {
  return !!token && typeof token === "string" && token.trim() !== "" && token !== "undefined" && token !== "null";
}

/** Append locale query param if path does not already have query string. */
export function withLocale(path: string, locale?: string): string {
  if (!locale || !/^[a-z]{2}$/.test(locale)) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}locale=${encodeURIComponent(locale)}`;
}

export async function apiFetch(
  path: string,
  options: RequestInit & { token?: string; locale?: string } = {}
) {
  const { token, locale, ...rest } = options;
  const urlPath = withLocale(path, locale);
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(rest.headers as Record<string, string>),
  };
  if (isValidToken(token)) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${urlPath}`, { ...rest, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

export async function apiPostForm(
  path: string,
  formData: FormData,
  token?: string,
  locale?: string
) {
  const urlPath = withLocale(path, locale);
  const headers: HeadersInit = {};
  if (isValidToken(token)) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${urlPath}`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}
