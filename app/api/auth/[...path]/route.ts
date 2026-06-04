import { auth } from '@/lib/auth';

// Catch-all Neon Auth handler: serves sign-in/sign-up/session/sign-out and the
// OAuth callback under /api/auth/*, proxying to the Neon Auth backend.
export const { GET, POST } = auth.handler();
