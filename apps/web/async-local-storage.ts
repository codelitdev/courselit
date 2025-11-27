import { AsyncLocalStorage } from "node:async_hooks";

export const als = new AsyncLocalStorage<Map<string, any>>();
