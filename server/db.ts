import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import * as authSchema from "@shared/models/auth";

const connectionString = process.env.DOKPLOY_DB_URL || process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString,
});

export const db = drizzle(pool, { schema: { ...schema, ...authSchema } });
