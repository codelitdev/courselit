import { AsyncLocalStorage } from "node:async_hooks";

export const domainContext = new AsyncLocalStorage<string>();

export const getDomainId = () => {
    return domainContext.getStore();
};

export const runWithDomain = <T>(domainId: string, fn: () => T): T => {
    return domainContext.run(domainId, fn);
};
