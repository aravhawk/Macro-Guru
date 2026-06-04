'use client';

import { createAuthClient } from '@neondatabase/auth/next';

// Client-side Neon Auth instance. Talks to the same-origin /api/auth/[...path]
// handler, which proxies to the Neon Auth backend. Exposes signIn.email,
// signUp.email, signOut, and the useSession hook.
export const authClient = createAuthClient();
