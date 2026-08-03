import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resetPasswordSchema } from "@/lib/auth/schema";

/**
 * The security property: an ordinary signed-in session must prove knowledge of
 * the CURRENT password before it can change it, while a session created by a
 * reset email must not be asked for one.
 *
 * Without the first half, an unattended laptop or a stolen session cookie was a
 * permanent account takeover — worst of all for the super admin, who can act as
 * every tenant.
 */

const supabase = {
  auth: {
    getUser: vi.fn(),
    updateUser: vi.fn(),
    signOut: vi.fn(),
  },
};
const publicAuth = { signInWithPassword: vi.fn() };
const recovery = { has: false };

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => supabase,
}));
vi.mock("@/lib/supabase/public", () => ({
  createPublicClient: () => ({ auth: publicAuth }),
}));
vi.mock("@/lib/auth/recovery-session", () => ({
  hasRecoverySession: async () => recovery.has,
  clearRecoverySession: async () => {},
}));
vi.mock("@/lib/auth/landing-path", () => ({
  landingPathFor: async () => "/platform",
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    // Mirrors the real redirect(), which throws to unwind the action.
    const error = new Error(`NEXT_REDIRECT:${to}`);
    throw error;
  },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const { updatePassword } = await import("@/lib/auth/actions");

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const NEW = { password: "brand-new-secret", confirm: "brand-new-secret" };

/** Runs the action, turning the redirect-throw back into a value. */
async function run(fd: FormData) {
  try {
    return { state: await updatePassword({}, fd), redirected: false };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("NEXT_REDIRECT")) {
      return { state: {}, redirected: true };
    }
    throw error;
  }
}

describe("updatePassword", () => {
  beforeEach(() => {
    recovery.has = false;
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "boss@example.com" } },
    });
    supabase.auth.updateUser.mockResolvedValue({ error: null });
    supabase.auth.signOut.mockResolvedValue({ error: null });
    publicAuth.signInWithPassword.mockResolvedValue({ error: null });
  });

  afterEach(() => vi.clearAllMocks());

  describe("ordinary signed-in session", () => {
    it("refuses without the current password", async () => {
      const { state } = await run(form(NEW));
      expect(state.error).toMatch(/current password/i);
      expect(supabase.auth.updateUser).not.toHaveBeenCalled();
    });

    it("refuses when the current password is wrong", async () => {
      publicAuth.signInWithPassword.mockResolvedValue({
        error: { message: "Invalid login credentials" },
      });

      const { state } = await run(
        form({ ...NEW, currentPassword: "not-it" }),
      );

      expect(state.error).toMatch(/incorrect/i);
      expect(supabase.auth.updateUser).not.toHaveBeenCalled();
    });

    it("changes the password when the current one is right", async () => {
      const { redirected } = await run(
        form({ ...NEW, currentPassword: "the-real-one" }),
      );

      expect(redirected).toBe(true);
      expect(publicAuth.signInWithPassword).toHaveBeenCalledWith({
        email: "boss@example.com",
        password: "the-real-one",
      });
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        password: NEW.password,
      });
    });

    it("verifies through a COOKIE-LESS client, not the request session", async () => {
      // Verifying with the request-bound client would rotate the user's auth
      // cookies as a side effect of a validation check.
      await run(form({ ...NEW, currentPassword: "the-real-one" }));
      expect(publicAuth.signInWithPassword).toHaveBeenCalled();
      expect(
        (supabase.auth as unknown as Record<string, unknown>)
          .signInWithPassword,
      ).toBeUndefined();
    });

    it("fails closed when the auth server is unreachable", async () => {
      publicAuth.signInWithPassword.mockRejectedValue(new Error("down"));
      const { state } = await run(form({ ...NEW, currentPassword: "x" }));
      expect(state.error).toMatch(/incorrect/i);
      expect(supabase.auth.updateUser).not.toHaveBeenCalled();
    });
  });

  describe("recovery session from an email link", () => {
    beforeEach(() => {
      recovery.has = true;
    });

    it("does NOT ask for a current password", async () => {
      const { redirected } = await run(form(NEW));
      expect(redirected).toBe(true);
      expect(publicAuth.signInWithPassword).not.toHaveBeenCalled();
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        password: NEW.password,
      });
    });
  });

  it("signs out every OTHER session after a successful change", async () => {
    // The threat being answered is a session someone else holds; leaving it
    // alive would defeat the point of changing the password.
    recovery.has = true;
    await run(form(NEW));
    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: "others" });
  });

  it("still succeeds if signing out other sessions fails", async () => {
    recovery.has = true;
    supabase.auth.signOut.mockRejectedValue(new Error("nope"));
    const { redirected } = await run(form(NEW));
    expect(redirected).toBe(true);
  });

  it("rejects a session that is not signed in at all", async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    const { state } = await run(form({ ...NEW, currentPassword: "x" }));
    expect(state.error).toMatch(/invalid or has expired/i);
  });
});

describe("resetPasswordSchema", () => {
  it("leaves currentPassword optional — the action decides, not the schema", () => {
    expect(resetPasswordSchema.safeParse(NEW).success).toBe(true);
  });

  it("still enforces the new password rules", () => {
    expect(
      resetPasswordSchema.safeParse({ password: "short", confirm: "short" })
        .success,
    ).toBe(false);
    expect(
      resetPasswordSchema.safeParse({ password: "longenough1", confirm: "x" })
        .success,
    ).toBe(false);
  });
});
