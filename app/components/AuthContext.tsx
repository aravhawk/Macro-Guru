'use client';

import { createContext, useContext, ReactNode } from 'react';
import { authClient } from '@/lib/auth-client';

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signup: (email: string, password: string) => Promise<void>;
  signin: (email: string, password: string) => Promise<void>;
  signout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isPending } = authClient.useSession();
  const user: User | null = data?.user
    ? { id: data.user.id, email: data.user.email }
    : null;

  async function signup(email: string, password: string) {
    // Neon Auth requires a name; derive it from the email local-part so the
    // sign-up form stays email + password only.
    const { error } = await authClient.signUp.email({
      email,
      password,
      name: email.split('@')[0] || email,
    });
    if (error) throw new Error(error.message || 'Signup failed');
  }

  async function signin(email: string, password: string) {
    const { error } = await authClient.signIn.email({ email, password });
    if (error) throw new Error(error.message || 'Signin failed');
  }

  async function signout() {
    await authClient.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, loading: isPending, signup, signin, signout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
