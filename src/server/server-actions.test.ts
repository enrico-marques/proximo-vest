import { beforeEach, describe, expect, it, vi } from "vitest";

const set = vi.fn();
vi.mock("next/headers", () => ({ cookies: async () => ({ set, get: vi.fn() }) }));

const { setValueToCookie } = await import("./server-actions");

beforeEach(() => set.mockClear());

describe("setValueToCookie", () => {
  it("writes UI preference cookies", async () => {
    await setValueToCookie("theme_mode", "dark");
    expect(set).toHaveBeenCalledWith("theme_mode", "dark", expect.objectContaining({ path: "/" }));
  });

  it.each(["better-auth.session_token", "__Secure-better-auth.session_token", "anything"])(
    "refuses to write %s",
    async (key) => {
      await setValueToCookie(key, "x");
      expect(set).not.toHaveBeenCalled();
    },
  );

  it("refuses oversized values", async () => {
    await setValueToCookie("theme_mode", "x".repeat(65));
    expect(set).not.toHaveBeenCalled();
  });
});
