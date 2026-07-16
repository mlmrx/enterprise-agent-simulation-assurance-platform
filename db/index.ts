import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";
import * as schema from "./schema";

type EasapDatabase = LibSQLDatabase<typeof schema>;

const databaseGlobal = globalThis as typeof globalThis & {
  __easapDatabaseClient?: Client;
  __easapDatabase?: EasapDatabase;
};

function configuredDatabaseUrl() {
  const url = process.env.DATABASE_URL?.trim() || "file:./data/easap.db";
  if (url.startsWith("file:") && url !== "file::memory:") {
    const filePath = url.slice("file:".length);
    mkdirSync(
      dirname(resolve(/* turbopackIgnore: true */ process.cwd(), filePath)),
      { recursive: true },
    );
  }
  return url;
}

export function getDatabaseClient() {
  databaseGlobal.__easapDatabaseClient ??= createClient({
    url: configuredDatabaseUrl(),
    authToken: process.env.DATABASE_AUTH_TOKEN?.trim() || undefined,
  });
  return databaseGlobal.__easapDatabaseClient;
}

export function getDb() {
  databaseGlobal.__easapDatabase ??= drizzle(getDatabaseClient(), { schema });
  return databaseGlobal.__easapDatabase;
}
