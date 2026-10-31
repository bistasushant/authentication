import type { Metadata } from "next";
import { OtpVerifyForm } from "@/components/auth/otp-verify-form";

export const metadata: Metadata = {
  title: "Verify Code — Clipper",
};

export default function VerifyPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <OtpVerifyForm />
    </div>
  );
}
