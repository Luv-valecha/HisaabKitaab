/** Browser-side API client. All UI network access goes through here (never fetch() in components). */
export class ApiError extends Error {
  constructor(status, code, message, details) { super(message); this.status = status; this.code = code; this.details = details; }
}

export async function api(method, path, body) {
  let res;
  try {
    res = await fetch(path, { method, headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined, credentials: "same-origin" });
  } catch {
    throw new ApiError(0, "NETWORK", "Can't reach the server. Check your connection and try again.");
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, json?.error?.code ?? "ERROR", json?.error?.message ?? "Something went wrong", json?.error?.details);
  return json?.data;
}
export const get = (p) => api("GET", p);
export const post = (p, b) => api("POST", p, b ?? {});
export const put = (p, b) => api("PUT", p, b);
export const patch = (p, b) => api("PATCH", p, b);
export const del = (p) => api("DELETE", p);

/** Map server validation details to {field: message} for forms. */
export const fieldErrors = (err) => Object.fromEntries((err?.details ?? []).map((d) => [d.path, d.message]));
