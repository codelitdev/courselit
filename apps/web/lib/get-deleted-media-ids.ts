import { extractMediaIDs } from "@courselit/utils";

export default function getDeletedMediaIds(
    prev: string,
    next: string,
): string[] {
    const prevSrcs = extractMediaIDs(prev);
    const nextSrcs = extractMediaIDs(next);

    return Array.from(prevSrcs).filter((src) => !nextSrcs.has(src));
}
