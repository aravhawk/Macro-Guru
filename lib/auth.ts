import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { sql } from './db';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-change-me');
const COOKIE_NAME = 'auth_token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE}s`)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.userId as string;
  } catch {
    return null;
  }
}

export function getAuthTokenFromCookies(cookies: { get: (name: string) => { value: string } | undefined }): string | null {
  const token = cookies.get(COOKIE_NAME);
  return token?.value || null;
}

export async function getUserFromCookies(cookies: { get: (name: string) => { value: string } | undefined }): Promise<{ id: string; email: string } | null> {
  const token = getAuthTokenFromCookies(cookies);
  if (!token) return null;

  const userId = await verifyToken(token);
  if (!userId) return null;

  const users = await sql`SELECT id, email FROM users WHERE id = ${userId}`;
  if (users.length === 0) return null;

  return users[0] as { id: string; email: string };
}

export { COOKIE_NAME, COOKIE_MAX_AGE };
