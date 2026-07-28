import type { Metadata } from "next";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = {
  title: "Reset password · Admin",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 py-16">
      <div className="w-full max-w-sm border border-dark-border bg-dark p-8">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-[1.6rem] tracking-[2px] text-white">
            RESET PASSWORD
          </h1>
          <p className="mt-2 text-[0.85rem] text-gray">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>
        <ForgotForm />
      </div>
    </main>
  );
}
