"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { siteConfig } from "@/config/site";
import { authClient } from "@/lib/auth-client";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastMethod, setLastMethod] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const method = authClient.getLastUsedLoginMethod();
    setLastMethod(method);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const { error } = await authClient.signIn.email({
        email,
        password,
        callbackURL: "/registration/overview",
      });

      if (error) {
        if (error.status === 403) {
          setUnverifiedEmail(email);
        } else {
          setError(error.message || "Failed to sign in");
        }
      } else {
        router.push("/registration/overview");
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/registration/overview",
    });
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sign In</CardTitle>
          <CardDescription>Welcome back to {siteConfig.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="relative">
              <Button
                type="submit"
                variant={lastMethod === "email" ? "default" : "outline"}
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In with Email"}
              </Button>
              {lastMethod === "email" && (
                <Badge
                  variant="secondary"
                  className="absolute -top-2 -right-2 shadow-md border-2 border-background"
                >
                  Last used
                </Badge>
              )}
            </div>

            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded-md">
                {error}
              </div>
            )}

            {unverifiedEmail && (
              <div className="p-3 text-sm bg-yellow-50 dark:bg-yellow-950 rounded-md">
                <p className="text-yellow-800 dark:text-yellow-200 mb-2">
                  Email not verified
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await authClient.sendVerificationEmail({
                      email: unverifiedEmail,
                      callbackURL: "/registration/overview",
                    });
                    setResendSuccess(true);
                  }}
                  disabled={resendSuccess}
                >
                  {resendSuccess
                    ? "Verification email sent!"
                    : "Resend verification email"}
                </Button>
              </div>
            )}

            <div className="flex justify-end">
              <Link
                href="/account/forgot-password"
                className="text-sm text-muted-foreground hover:text-primary underline"
              >
                Forgot password?
              </Link>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="relative">
              <Button
                type="button"
                variant={lastMethod === "google" ? "default" : "outline"}
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                <svg
                  className="mr-2 h-4 w-4"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </Button>
              {lastMethod === "google" && (
                <Badge
                  variant="secondary"
                  className="absolute -top-2 -right-2 shadow-md border-2 border-background"
                >
                  Last used
                </Badge>
              )}
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/sign-up" className="underline hover:text-primary">
                Sign up
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
