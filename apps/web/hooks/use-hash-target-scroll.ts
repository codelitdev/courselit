"use client";

import { useCallback, useEffect, useState } from "react";
import {
    focusHashTarget,
    getCurrentHashTargetId,
    scheduleScrollToHashTarget,
} from "@/lib/hash-target";

export type UseHashTargetScrollOptions = {
    /**
     * When true, attempt to scroll/highlight the current hash target.
     * Typically `comments.length > 0` so the target node can exist in the DOM.
     */
    contentReady: boolean;
    /**
     * Extra window events that mean the target may have changed without a
     * hashchange (e.g. history.pushState + custom event for community
     * notifications).
     */
    syncEvents?: string[];
    /**
     * When this value changes, re-read the hash from the location
     * (e.g. productId/entityId or community postId).
     */
    scopeKey?: string;
};

/**
 * Shared deep-link scroll + highlight for community comments and product
 * discussions. Hash means "content target" only; callers own query/UI for
 * composers.
 */
export function useHashTargetScroll({
    contentReady,
    syncEvents = [],
    scopeKey,
}: UseHashTargetScrollOptions) {
    const [hashTargetId, setHashTargetId] = useState(() =>
        getCurrentHashTargetId(),
    );

    const syncFromLocation = useCallback(() => {
        setHashTargetId(getCurrentHashTargetId());
    }, []);

    useEffect(() => {
        syncFromLocation();
        window.addEventListener("hashchange", syncFromLocation);
        for (const eventName of syncEvents) {
            window.addEventListener(eventName, syncFromLocation);
        }
        return () => {
            window.removeEventListener("hashchange", syncFromLocation);
            for (const eventName of syncEvents) {
                window.removeEventListener(eventName, syncFromLocation);
            }
        };
        // syncEvents is expected to be a stable constant from the caller
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [syncFromLocation, syncEvents.join("\0")]);

    useEffect(() => {
        if (scopeKey === undefined) {
            return;
        }
        syncFromLocation();
    }, [scopeKey, syncFromLocation]);

    useEffect(() => {
        if (!hashTargetId || !contentReady) {
            return;
        }
        return scheduleScrollToHashTarget({ targetId: hashTargetId });
    }, [hashTargetId, contentReady]);

    const focusTarget = useCallback(
        (targetId: string, options?: { eventName?: string }) => {
            focusHashTarget({
                targetId,
                eventName: options?.eventName,
            });
            setHashTargetId(
                targetId.replace(/^#/, "").split("#")[0] || targetId,
            );
        },
        [],
    );

    return {
        hashTargetId,
        setHashTargetId,
        focusTarget,
        syncFromLocation,
    };
}
