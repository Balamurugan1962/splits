import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Singleton pattern — reuse the same DB instance across hot module reloads
// and across serverless function invocations on the same Node instance.
// This avoids re-creating the connection pool on every request.
const globalForDb = globalThis as unknown as {
  _db?: ReturnType<typeof drizzle>;
};

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://placeholder:placeholder@ep-placeholder.region.aws.neon.tech/neondb?sslmode=require";

function createDb() {
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}

export const db = globalForDb._db ?? createDb();

if (process.env.NODE_ENV !== "production") {
  // In dev, persist across hot-reloads to avoid exhausting connections
  globalForDb._db = db;
}
