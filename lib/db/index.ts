import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

export function createDb(databaseUrl: string) {
  return drizzle({ connection: databaseUrl, schema });
}

export type Database = ReturnType<typeof createDb>;
