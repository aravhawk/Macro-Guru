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

  return (
    <div className="space-y-6">
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
