import { afterEach, describe, expect, it, vi } from "vitest";
import { getPrincipal, isAuthorized, type Principal } from "../src/lib/auth";

function makeRequest(headers: Record<string, string> = {}): { headers: { get(name: string): string | null } } {
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) lower[k.toLowerCase()] = v;
  return {
    headers: {
      get(name: string) {
        return lower[name.toLowerCase()] ?? null;
      },
    },
  };
}

function principalHeader(p: Principal): string {
  return Buffer.from(JSON.stringify(p), "utf-8").toString("base64");
}

const bprussell: Principal = {
  identityProvider: "github",
  userId: "abc",
  userDetails: "bprussell",
  userRoles: ["authenticated"],
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getPrincipal", () => {
  it("returns null when header is missing", () => {
    expect(getPrincipal(makeRequest() as never)).toBeNull();
  });

  it("decodes a valid base64 JSON header", () => {
    const req = makeRequest({ "x-ms-client-principal": principalHeader(bprussell) });
    expect(getPrincipal(req as never)?.userDetails).toBe("bprussell");
  });

  it("returns null on malformed base64/JSON", () => {
    const req = makeRequest({ "x-ms-client-principal": "{not valid base64 json" });
    expect(getPrincipal(req as never)).toBeNull();
  });
});

describe("isAuthorized", () => {
  it("AUTH_DISABLED=1 bypasses everything", () => {
    vi.stubEnv("AUTH_DISABLED", "1");
    vi.stubEnv("AUTH_ALLOWED_USERS", "");
    expect(isAuthorized(makeRequest() as never)).toBe(true);
  });

  it("fails closed when AUTH_ALLOWED_USERS is empty/missing", () => {
    vi.stubEnv("AUTH_DISABLED", "");
    vi.stubEnv("AUTH_ALLOWED_USERS", "");
    const req = makeRequest({ "x-ms-client-principal": principalHeader(bprussell) });
    expect(isAuthorized(req as never)).toBe(false);
  });

  it("rejects when no principal header present", () => {
    vi.stubEnv("AUTH_ALLOWED_USERS", "bprussell");
    expect(isAuthorized(makeRequest() as never)).toBe(false);
  });

  it("rejects when principal is not in allowlist", () => {
    vi.stubEnv("AUTH_ALLOWED_USERS", "bprussell");
    const stranger: Principal = { ...bprussell, userDetails: "someone-else" };
    const req = makeRequest({ "x-ms-client-principal": principalHeader(stranger) });
    expect(isAuthorized(req as never)).toBe(false);
  });

  it("accepts when principal matches allowlist", () => {
    vi.stubEnv("AUTH_ALLOWED_USERS", "bprussell");
    const req = makeRequest({ "x-ms-client-principal": principalHeader(bprussell) });
    expect(isAuthorized(req as never)).toBe(true);
  });

  it("supports multiple allowed users (comma-separated)", () => {
    vi.stubEnv("AUTH_ALLOWED_USERS", "alice, bprussell ,carol");
    const req = makeRequest({ "x-ms-client-principal": principalHeader(bprussell) });
    expect(isAuthorized(req as never)).toBe(true);
  });
});
