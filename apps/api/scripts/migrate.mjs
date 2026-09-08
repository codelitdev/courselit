import { Client } from "pg";
import { applyMigrations } from "../src/db/migrate.ts";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL_REQUIRED");
const client = new Client({ connectionString: databaseUrl });
await client.connect();
await applyMigrations((sql) => client.query(sql));
const tables = await client.query(
  "select tablename from pg_tables where schemaname = 'public' order by tablename",
);
process.stdout.write(
  `${JSON.stringify({ migrated: true, tables: tables.rows.map((row) => row.tablename) })}\n`,
);
await client.end();
