import { z } from "zod";

/**
 * Validation for the email/password login form.
 * Used by the login server action to reject malformed input before it ever
 * reaches Supabase (skill: "Validate all requests with Zod").
 */
export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** Request a password-reset email. */
export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/** Set a new password (from a recovery session). */
export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters."),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords don't match.",
    path: ["confirm"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
