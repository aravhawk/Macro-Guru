"use client";

import { useState } from "react";
import { signIn, signUp } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "sign-in") {
        const res = await signIn.email({ email, password });
        if (res.error) setError(res.error.message ?? "Sign in failed");
        else window.location.href = "/";
      } else {
        const res = await signUp.email({ email, password, name });
        if (res.error) setError(res.error.message ?? "Sign up failed");
        else window.location.href = "/";
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    await signIn.social({
      provider: "google",
      callbackURL: "/",
    });
  }

  return (
    <div className="space-y-6">
      <Button
        variant="outline"
        className="w-full border-border/50 hover:bg-secondary"
        onClick={handleGoogleSignIn}
      >
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
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

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/50" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "sign-up" && (
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Name</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="bg-secondary border-border/50 text-foreground"
              required
            />
          </div>
        )}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Email</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="bg-secondary border-border/50 text-foreground"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Password</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="bg-secondary border-border/50 text-foreground"
            required
            minLength={8}
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button
          type="submit"
          className="w-full bg-emerald hover:bg-emerald/90 text-primary-foreground"
          disabled={loading}
        >
          {loading
            ? "Loading..."
            : mode === "sign-in"
              ? "Sign In"
              : "Create Account"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {mode === "sign-in" ? (
          <>
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="text-emerald hover:underline">
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/sign-in" className="text-emerald hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
