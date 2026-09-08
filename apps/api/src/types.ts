import type { PgliteDatabase } from "drizzle-orm/pglite";
import type * as schema from "./db/schema/index.js";
import type { CourseLitPermission } from "./permissions.js";

export type AppDb = PgliteDatabase<typeof schema>;

export type { CourseLitPermission };

export type IncomingRequest = {
  method: string;
  path: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  rawBody?: string;
};

export type DispatchResponse = {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
};
