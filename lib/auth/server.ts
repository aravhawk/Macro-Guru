import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createDb } from "@/lib/db";

function getAuth() {
  const db = createDb(process.env.DATABASE_URL!);

  return betterAuth({
    baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db as never, { provider: "pg" }),
    emailAndPassword: {
      enabled: true,
    },
  });
}

export const auth = getAuth();
export type Auth = ReturnType<typeof getAuth>;
