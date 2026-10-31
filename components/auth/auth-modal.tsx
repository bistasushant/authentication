"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScissorsIcon, ArrowLeftIcon, MailIcon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc";
import { useUserState } from "@/_state/user.state";
import { useAuthModal } from "@/_state/auth-modal.state";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
  FieldSeparator,
} from "@/components/ui/field";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { GoogleIcon } from "@/components/auth/google-icon";

type Step = "email" | "otp";

const RESEND_COOLDOWN = 60;
const OTP_LENGTH = 6;

export function AuthModal() {
  const { open, closeModal } = useAuthModal();
  const router = useRouter();
  const trpc = useTRPC();
  const setUser = useUserState((s) => s.setUser);

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [serverError, setServerError] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // ── Cooldown timer ─────────────────────────────────────────────────────────
  function startCooldown() {
    setCooldown(RESEND_COOLDOWN);
    const tick = () =>
      setCooldown((c) => {
        if (c <= 1) return 0;
        setTimeout(tick, 1000);
        return c - 1;
      });
    setTimeout(tick, 1000);
  }

  // ── Reset on close ────────────────────────────────────────────────────────
  function handleOpenChange(next: boolean) {
    if (!next) {
      closeModal();
      setTimeout(() => {
        setStep("email");
        setEmail("");
        setEmailError("");
        setServerError("");
        setOtpCode("");
        setCooldown(0);
      }, 200);
    }
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  const sendOtpMutation = useMutation(
    trpc.auth.sendOtp.mutationOptions({
      onError(err: { message: string }) {
        setServerError(err.message);
      },
    })
  );

  const verifyOtpMutation = useMutation(
    trpc.auth.verifyOtp.mutationOptions({
      onSuccess({ user }: { user: Parameters<typeof setUser>[0] }) {
        setUser(user);
        toast.success("Signed in successfully!");
        closeModal();
        router.refresh();
      },
      onError(err: { message: string }) {
        setServerError(err.message);
        setOtpCode("");
      },
    })
  );

  const resendMutation = useMutation(
    trpc.auth.sendOtp.mutationOptions({
      onSuccess(result: { devOtp?: string }) {
        startCooldown();
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

  const googleMutation = useMutation(
    trpc.auth.googleSignIn.mutationOptions({
      onSuccess({ user }: { user: Parameters<typeof setUser>[0] }) {
        setUser(user);
        toast.success("Signed in successfully!");
        closeModal();
        router.refresh();
      },
      onError(err: { message: string }) {
        setServerError(err.message);
      },
    })
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  function validateEmail(value: string): boolean {
    if (!value.trim()) { setEmailError("Email is required."); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError("Please enter a valid email address.");
      return false;
    }
    setEmailError("");
    return true;
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");
    if (!validateEmail(email)) return;

    const result = await sendOtpMutation
      .mutateAsync({ email: email.toLowerCase().trim() })
      .catch(() => null);

    if (!result) return;

    if ("devOtp" in result && result.devOtp) {
      toast.info(`Dev OTP: ${result.devOtp}`, {
        duration: 30_000,
        description: "Local dev mode — not sent via email.",
      });
    }

    startCooldown();
    setStep("otp");
  }

  async function handleOtpComplete(value: string) {
    if (value.length !== OTP_LENGTH) return;
    setServerError("");
    await verifyOtpMutation.mutateAsync({
      email: email.toLowerCase().trim(),
      code: value,
    });
  }

  async function handleResend() {
    if (cooldown > 0 || resendMutation.isPending) return;
    await resendMutation.mutateAsync({ email: email.toLowerCase().trim() });
  }

  function handleGoogleSignIn() {
    setServerError("");

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setServerError("Google Sign-In is not configured. Please contact support.");
      return;
    }

    if (!window.google?.accounts?.id) {
      setServerError(
        "Google Sign-In failed to load. Please refresh the page and try again."
      );
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async ({ credential }) => {
        await googleMutation.mutateAsync({ idToken: credential });
      },
      cancel_on_tap_outside: true,
    });

    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        const reason = notification.isNotDisplayed()
          ? notification.getNotDisplayedReason()
          : notification.getSkippedReason();
        console.warn("[Google Sign-In] Prompt suppressed:", reason);
        setServerError(
          "Google Sign-In popup was blocked. " +
          "Please allow popups for this site and try again."
        );
      }
    });
  }

  const maskedEmail = email.replace(/(.{2}).+(@.+)/, "$1***$2");
  const isEmailLoading = sendOtpMutation.isPending || googleMutation.isPending;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm p-6">

        {step === "email" ? (
          <div className="flex flex-col gap-5">
            {/* Brand */}
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <ScissorsIcon className="size-4" />
              </div>
              <p className="font-semibold text-base">Sign in to Clipper</p>
              <p className="text-xs text-muted-foreground">
                Enter your email to continue
              </p>
            </div>

            {serverError && (
              <Alert variant="destructive">
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleEmailSubmit} noValidate>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="modal-email">Email address</FieldLabel>
                  <Input
                    id="modal-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) validateEmail(e.target.value);
                    }}
                    disabled={isEmailLoading}
                    aria-invalid={!!emailError}
                    className="h-9"
                  />
                  {emailError && <FieldError>{emailError}</FieldError>}
                </Field>
                <Button type="submit" className="w-full h-9" disabled={isEmailLoading}>
                  {sendOtpMutation.isPending ? (
                    <><Spinner className="size-3.5" />Sending code…</>
                  ) : "Continue with Email"}
                </Button>
              </FieldGroup>
            </form>

            <FieldSeparator>or</FieldSeparator>

            <Button
              type="button"
              variant="outline"
              className="w-full h-9 gap-2"
              onClick={handleGoogleSignIn}
              disabled={isEmailLoading}
            >
              {googleMutation.isPending
                ? <Spinner className="size-3.5" />
                : <GoogleIcon className="size-4" />}
              Continue with Google
            </Button>
          </div>

        ) : (
          <div className="flex flex-col gap-5">
            {/* Brand */}
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <MailIcon className="size-4" />
              </div>
              <p className="font-semibold text-base">Check your email</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                We sent a 6-digit code to{" "}
                <span className="font-medium text-foreground">{maskedEmail}</span>
              </p>
            </div>

            {serverError && (
              <Alert variant="destructive">
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col items-center gap-3">
              <InputOTP
                maxLength={OTP_LENGTH}
                value={otpCode}
                onChange={setOtpCode}
                onComplete={handleOtpComplete}
                disabled={verifyOtpMutation.isPending}
                autoFocus
                aria-label="Verification code"
              >
                <InputOTPGroup>
                  {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                    <InputOTPSlot key={i} index={i} className="size-10 text-base" />
                  ))}
                </InputOTPGroup>
              </InputOTP>

              {verifyOtpMutation.isPending && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Spinner className="size-3" /> Verifying…
                </div>
              )}
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Didn&apos;t receive the code?{" "}
              {cooldown > 0 ? (
                <span>Resend in {cooldown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendMutation.isPending}
                  className="inline-flex items-center gap-1 underline underline-offset-3 hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {resendMutation.isPending
                    ? <Spinner className="size-3" />
                    : <RefreshCwIcon className="size-3" />}
                  Resend
                </button>
              )}
            </p>

            <div className="flex justify-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground text-xs h-7"
                onClick={() => { setStep("email"); setOtpCode(""); setServerError(""); }}
              >
                <ArrowLeftIcon className="size-3" />
                Back
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
