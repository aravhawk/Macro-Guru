"use client";

import { AuthForm } from "@/components/auth/auth-form";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative z-10">
      <div className="w-full max-w-md mx-auto p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-heading font-bold text-foreground">
            Macro Guru
          </h1>
          <p className="text-muted-foreground mt-2">
            Create an account to get started
          </p>
        </div>
        <AuthForm mode="sign-up" />
      </div>
    </div>
  );
}
