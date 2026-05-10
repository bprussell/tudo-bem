import type { HttpRequest } from "@azure/functions";

// Static Web Apps injects this header on authenticated requests. Shape:
// https://learn.microsoft.com/azure/static-web-apps/user-information
export type Principal = {
  identityProvider: string;
  userId: string;
  userDetails: string; // GitHub username for github provider, email for aad
  userRoles: string[];
};

export function getPrincipal(request: HttpRequest): Principal | null {
  const header = request.headers.get("x-ms-client-principal");
  if (!header) return null;
  try {
    const json = Buffer.from(header, "base64").toString("utf-8");
    return JSON.parse(json) as Principal;
  } catch {
    return null;
  }
}

/**
 * Checks whether the request is authorized.
 *
 * - AUTH_DISABLED=1 → bypass (local dev).
 * - AUTH_ALLOWED_USERS unset/empty in prod → fail closed (no one in).
 *   This is intentional: a misconfigured prod is locked, not open.
 * - Otherwise: principal.userDetails must match an entry in
 *   AUTH_ALLOWED_USERS (comma-separated).
 */
export function isAuthorized(request: HttpRequest): boolean {
  if (process.env.AUTH_DISABLED === "1") return true;

  const allowed = (process.env.AUTH_ALLOWED_USERS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowed.length === 0) return false;

  const principal = getPrincipal(request);
  if (!principal) return false;
  return allowed.includes(principal.userDetails);
}

export function unauthorizedResponse() {
  return { status: 401 as const, jsonBody: { error: "unauthorized" } };
}
