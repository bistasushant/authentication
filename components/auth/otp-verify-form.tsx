"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftIcon, MailIcon, RefreshCwIcon, ScissorsIcon } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc";
import { useUserState } from "@/_state/user.state";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Field, FieldGroup, FieldDescription } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

const RESEND_COOLDOWN_SECONDS = 60;
const OTP_LENGTH = 6;

export function OtpVerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [code, setCode] = useState("");
  const [serverError, setServerError] = useState("");
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const trpc = useTRPC();
  const setUser = useUserState((s) => s.setUser);

  useEffect(() => {
    if (!email) router.replace("/");
  }, [email, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const verifyMutation = useMutation(
    trpc.auth.verifyOtp.mutationOptions({
      onSuccess({ user }: { user: Parameters<typeof setUser>[0] }) {
        setUser(user);
        toast.success("Signed in successfully!");
        router.push("/");
        router.refresh();
      },
      onError(err: { message: string }) {
        setServerError(err.message);
        setCode("");
      },
    })
  );

  const resendMutation = useMutation(
    trpc.auth.sendOtp.mutationOptions({
      onSuccess(result: { devOtp?: string }) {
        setCooldown(RESEND_COOLDOWN_SECONDS);
        setServerError("");
        if (result.devOtp) {
          toast.info(`Dev OTP: ${result.devOtp}`, {
            duration: 30_000,
            description: "Local dev mode — not sent via email.",
          });
        } else {
          toast.success("A new code has been sent to your email.");
        }
      },
      onError(err: { message: string }) {
        setServerError(err.message);
      },
    })
  );

  const handleComplete = useCallback(
    async (value: string) => {
      if (value.length !== OTP_LENGTH) return;
      setServerError("");
      await verifyMutation.mutateAsync({ email, code: value });
    },
    [email, verifyMutation]
  );

  const handleResend = async () => {
    if (cooldown > 0 || resendMutation.isPending) return;
    await resendMutation.mutateAsync({ email });
  };

  const maskedEmail = email
    ? email.replace(/(.{2}).+(@.+)/, "$1***$2")
    : "your email";

  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col items-center gap-3 text-center mb-8">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow">
          <ScissorsIcon className="size-4" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Check your email</h1>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
            We sent a 6-digit code to{" "}
            <span className="font-medium text-foreground">{maskedEmail}</span>.
            <br />
            Enter it below to continue.
          </p>
        </div>
      </div>

      <FieldGroup>
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <Field>
          <div className="flex flex-col items-center gap-3">
            <InputOTP
              maxLength={OTP_LENGTH}
              value={code}
              onChange={setCode}
              onComplete={handleComplete}
              disabled={verifyMutation.isPending}
              autoFocus
              aria-label="Verification code"
            >
              <InputOTPGroup>
                {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                  <InputOTPSlot key={i} index={i} className="size-11 text-base" />
                ))}
              </InputOTPGroup>
            </InputOTP>

            {verifyMutation.isPending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner className="size-3.5" />
                Verifying…
              </div>
            )}
          </div>
        </Field>

        <FieldDescription className="text-center">
          Didn&apos;t receive the code?{" "}
          {cooldown > 0 ? (
            <span className="text-muted-foreground">Resend in {cooldown}s</span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resendMutation.isPending}
              className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-primary transition-colors disabled:opacity-50"
            >
              {resendMutation.isPending
                ? <Spinner className="size-3" />
                : <RefreshCwIcon className="size-3" />}
              Resend code
            </button>
          )}
        </FieldDescription>

        <div className="flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => router.push("/")}
          >
            <ArrowLeftIcon className="size-3.5" />
            Back
          </Button>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/70">
          <MailIcon className="size-3" />
          <span>{email}</span>
        </div>
      </FieldGroup>
    </div>
  );
}
