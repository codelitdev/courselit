import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import { migrationsFolder } from "../src/db/migrate.ts";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL_REQUIRED");
const client = new Client({ connectionString: databaseUrl });
await client.connect();
await migrate(drizzle(client), { migrationsFolder });
const tables = await client.query(
  "select tablename from pg_tables where schemaname = 'public' order by tablename",
);
process.stdout.write(
  `${JSON.stringify({ migrated: true, tables: tables.rows.map((row) => row.tablename) })}\n`,
);
await client.end();
