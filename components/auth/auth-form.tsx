"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScissorsIcon } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc";
import { useUserState } from "@/_state/user.state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
  FieldSeparator,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GoogleIcon } from "@/components/auth/google-icon";

export function AuthForm() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [serverError, setServerError] = useState("");
  const router = useRouter();
  const trpc = useTRPC();
  const setUser = useUserState((s) => s.setUser);

  const sendOtpMutation = useMutation(
    trpc.auth.sendOtp.mutationOptions({
      onError(err: { message: string }) {
        setServerError(err.message);
      },
    })
  );

  const googleSignInMutation = useMutation(
    trpc.auth.googleSignIn.mutationOptions({
      onSuccess({ user }: { user: Parameters<typeof setUser>[0] }) {
        setUser(user);
        router.push("/");
        router.refresh();
      },
      onError(err: { message: string }) {
        setServerError(err.message);
      },
    })
  );

  function validateEmail(value: string): boolean {
    if (!value.trim()) { setEmailError("Email is required."); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError("Please enter a valid email address.");
      return false;
    }
    setEmailError("");
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
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

    router.push(
      `/login/verify?email=${encodeURIComponent(email.toLowerCase().trim())}`
    );
  }

  async function handleGoogleSignIn() {
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
        await googleSignInMutation
          .mutateAsync({ idToken: credential })
          .catch(() => null);
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

  const isLoading = sendOtpMutation.isPending || googleSignInMutation.isPending;

  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col items-center gap-3 text-center mb-8">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow">
          <ScissorsIcon className="size-4" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Sign in to Clipper</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your email to continue
          </p>
        </div>
      </div>

      <FieldGroup>
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email address</FieldLabel>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) validateEmail(e.target.value);
                }}
                disabled={isLoading}
                aria-invalid={!!emailError}
                className="h-10"
              />
              {emailError && <FieldError>{emailError}</FieldError>}
            </Field>

            <Field>
              <Button type="submit" className="w-full h-10" disabled={isLoading}>
                {sendOtpMutation.isPending ? (
                  <><Spinner className="size-3.5" />Sending code…</>
                ) : "Continue with Email"}
              </Button>
            </Field>
          </FieldGroup>
        </form>

        <FieldSeparator>or</FieldSeparator>

        <Button
          type="button"
          variant="outline"
          className="w-full h-10 gap-2"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
        >
          {googleSignInMutation.isPending
            ? <Spinner className="size-3.5" />
            : <GoogleIcon className="size-4" />}
          Continue with Google
        </Button>
      </FieldGroup>
    </div>
  );
}
