import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { config, proxy } from "./proxy";

const SESSION_COOKIE = "better-auth.session_token=abc.def";

function request(path: string, cookie?: string) {
  return new NextRequest(`http://localhost${path}`, cookie ? { headers: { cookie } } : undefined);
}

describe("proxy", () => {
  it.each(["/dashboard", "/dashboard/professor/listas", "/dashboard/admin/users/1/edit"])(
    "runs on %s",
    (url) => {
      expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
    },
  );

  it.each(["/", "/auth/login", "/api/teacher-lists", "/api/auth/get-session"])("does not run on %s", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false);
  });

  it("redirects to login without a session cookie", () => {
    const res = proxy(request("/dashboard/professor/listas"));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/auth/login");
  });

  it.each([SESSION_COOKIE, `__Secure-${SESSION_COOKIE}`])("lets the request through with %s", (cookie) => {
    const res = proxy(request("/dashboard", cookie));

    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });
});
