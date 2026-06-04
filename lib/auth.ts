import { createNeonAuth } from '@neondatabase/auth/next/server';

// Neon Auth (Better Auth) server singleton. Used in Route Handlers, Server
// Components, and Server Actions. `createNeonAuth` throws if the cookie secret
// is shorter than 32 characters, so we fail closed when env is missing — there
// is intentionally no fallback secret.
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
});

export type AuthUser = { id: string; email: string; name: string };

// Drop-in replacement for the old getUserFromCookies(): returns the
// authenticated user (Neon Auth id is a string) or null.
export async function getUser(): Promise<AuthUser | null> {
  const { data } = await auth.getSession();
  if (!data?.user) return null;
  const { id, email, name } = data.user;
  return { id, email, name };
}
