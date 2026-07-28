import type { Metadata } from "next";
import { AuthShell } from "@/components/marketing/auth-shell";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = {
  title: "Reset password · Aliamz Digital",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset password"
      subtitle="Enter your email and we'll send you a reset link."
    >
      <ForgotForm />
    </AuthShell>
  );
}
