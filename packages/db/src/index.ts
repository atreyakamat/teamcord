import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema/index.js";

export type DB = ReturnType<typeof createDb>;

export function createDb(connectionString: string) {
  const client = postgres(connectionString, { max: 10 });
  return drizzle(client, { schema });
}

export * from "./schema/index.js";
export { sql, eq, and, or, desc, asc, like, ilike, inArray, gte, lte } from "drizzle-orm";
