// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";

vi.mock("server-only", () => ({}));

const mockCookieSet = vi.fn();
const mockCookieDelete = vi.fn();
const mockCookieGet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      set: mockCookieSet,
      delete: mockCookieDelete,
      get: mockCookieGet,
    })
  ),
}));

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

describe("createSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  test("sets an auth-token cookie", async () => {
    const { createSession } = await import("@/lib/auth");
    await createSession("user-123", "test@example.com");

    expect(mockCookieSet).toHaveBeenCalledOnce();
    const [name] = mockCookieSet.mock.calls[0];
    expect(name).toBe("auth-token");
  });

  test("cookie carries a valid JWT with correct userId and email", async () => {
    const { createSession } = await import("@/lib/auth");
    await createSession("user-123", "test@example.com");

    const [, token] = mockCookieSet.mock.calls[0];
    const { payload } = await jwtVerify(token, JWT_SECRET);

    expect(payload.userId).toBe("user-123");
    expect(payload.email).toBe("test@example.com");
  });

  test("JWT expires in approximately 7 days", async () => {
    const { createSession } = await import("@/lib/auth");
    const before = Math.floor(Date.now() / 1000);
    await createSession("user-123", "test@example.com");
    const after = Math.floor(Date.now() / 1000);

    const [, token] = mockCookieSet.mock.calls[0];
    const { payload } = await jwtVerify(token, JWT_SECRET);

    const sevenDaysInSeconds = 7 * 24 * 60 * 60;
    expect(payload.exp).toBeGreaterThanOrEqual(before + sevenDaysInSeconds);
    expect(payload.exp).toBeLessThanOrEqual(after + sevenDaysInSeconds + 5);
  });

  test("cookie is httpOnly", async () => {
    const { createSession } = await import("@/lib/auth");
    await createSession("user-123", "test@example.com");

    const [, , options] = mockCookieSet.mock.calls[0];
    expect(options.httpOnly).toBe(true);
  });

  test("cookie is not secure in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { createSession } = await import("@/lib/auth");
    await createSession("user-123", "test@example.com");

    const [, , options] = mockCookieSet.mock.calls[0];
    expect(options.secure).toBe(false);
  });

  test("cookie is secure in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { createSession } = await import("@/lib/auth");
    await createSession("user-123", "test@example.com");

    const [, , options] = mockCookieSet.mock.calls[0];
    expect(options.secure).toBe(true);
  });

  test("cookie sameSite is lax", async () => {
    const { createSession } = await import("@/lib/auth");
    await createSession("user-123", "test@example.com");

    const [, , options] = mockCookieSet.mock.calls[0];
    expect(options.sameSite).toBe("lax");
  });

  test("cookie path is /", async () => {
    const { createSession } = await import("@/lib/auth");
    await createSession("user-123", "test@example.com");

    const [, , options] = mockCookieSet.mock.calls[0];
    expect(options.path).toBe("/");
  });

  test("cookie expires in approximately 7 days", async () => {
    const { createSession } = await import("@/lib/auth");
    const before = Date.now();
    await createSession("user-123", "test@example.com");
    const after = Date.now();

    const [, , options] = mockCookieSet.mock.calls[0];
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    expect(options.expires.getTime()).toBeGreaterThanOrEqual(
      before + sevenDaysMs
    );
    expect(options.expires.getTime()).toBeLessThanOrEqual(
      after + sevenDaysMs + 1000
    );
  });
});

describe("deleteSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  test("deletes the auth-token cookie", async () => {
    const { deleteSession } = await import("@/lib/auth");
    await deleteSession();

    expect(mockCookieDelete).toHaveBeenCalledOnce();
    expect(mockCookieDelete).toHaveBeenCalledWith("auth-token");
  });

  test("does not call set or get on the cookie store", async () => {
    const { deleteSession } = await import("@/lib/auth");
    await deleteSession();

    expect(mockCookieSet).not.toHaveBeenCalled();
    expect(mockCookieGet).not.toHaveBeenCalled();
  });

  test("resolves without throwing when no cookie is present", async () => {
    mockCookieDelete.mockImplementationOnce(() => undefined);
    const { deleteSession } = await import("@/lib/auth");

    await expect(deleteSession()).resolves.toBeUndefined();
    expect(mockCookieDelete).toHaveBeenCalledWith("auth-token");
  });

  test("propagates errors thrown by cookies()", async () => {
    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockRejectedValueOnce(new Error("headers unavailable"));
    const { deleteSession } = await import("@/lib/auth");

    await expect(deleteSession()).rejects.toThrow("headers unavailable");
  });

  test("deletes exactly once per call", async () => {
    const { deleteSession } = await import("@/lib/auth");
    await deleteSession();
    await deleteSession();

    expect(mockCookieDelete).toHaveBeenCalledTimes(2);
  });
});
