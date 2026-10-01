import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schemas/index.js";

function getDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/openbots"
  );
}

// prepare: false is required for Supabase transaction pooler (port 6543)
const client = postgres(getDatabaseUrl(), { prepare: false });

export const db = drizzle(client, { schema });
export type Database = typeof db;
