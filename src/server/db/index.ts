import {
  drizzle,
  type PostgresJsQueryResultHKT,
} from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "../../env.js";
import * as schema from "./schema";
import * as relations from "./relations";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { ExtractTablesWithRelations } from "drizzle-orm";

const schemaAndRelations = { ...schema, ...relations };

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const conn = globalForDb.conn ?? postgres(env.DATABASE_URL);
if (env.NODE_ENV !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, {
  schema: schemaAndRelations,
  casing: "snake_case",
});

export type Transaction = PgTransaction<
  PostgresJsQueryResultHKT,
  typeof schemaAndRelations,
  ExtractTablesWithRelations<typeof schemaAndRelations>
>;
