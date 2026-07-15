/** Query param to focus the top-level comment composer (not the hash). */
export const COMMUNITY_POST_REPLY_QUERY = "reply";
export const COMMUNITY_POST_REPLY_QUERY_VALUE = "1";

/** DOM id only — never use as a URL hash (hash is for comment/reply deep-links). */
export const COMMUNITY_POST_COMMENT_COMPOSER_ID =
    "community-post-comment-composer";

/**
 * Build a community post URL.
 * Use `{ reply: true }` for feed/community Reply → focus composer via query.
 */
export function communityPostHref(
    communityId: string,
    postId: string,
    options?: { reply?: boolean },
): string {
    const path = `/dashboard/community/${communityId}/${postId}`;
    if (options?.reply) {
        return `${path}?${COMMUNITY_POST_REPLY_QUERY}=${COMMUNITY_POST_REPLY_QUERY_VALUE}`;
    }
    return path;
}

export function shouldFocusCommunityPostComposer(
    searchParams: Pick<URLSearchParams, "get">,
): boolean {
    return (
        searchParams.get(COMMUNITY_POST_REPLY_QUERY) ===
        COMMUNITY_POST_REPLY_QUERY_VALUE
    );
}

/** Remove `reply` while preserving other search params and the hash. */
export function stripCommunityPostReplyFromUrl(href: string): string {
    const url = new URL(href, "http://local.invalid");
    url.searchParams.delete(COMMUNITY_POST_REPLY_QUERY);
    return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Scroll to and focus the top-level comment composer.
 * Does not read or write the URL hash (notifications own the hash).
 */
export function focusCommunityPostCommentComposer({
    behavior = "smooth",
    maxAttempts = 30,
    intervalMs = 50,
    stillWanted,
    onFocused,
}: {
    behavior?: ScrollBehavior;
    maxAttempts?: number;
    intervalMs?: number;
    /** If provided and returns false, abort (e.g. query param was cleared). */
    stillWanted?: () => boolean;
    /** Called once when the composer was found and focused. */
    onFocused?: () => void;
} = {}): () => void {
    if (typeof document === "undefined") {
        return () => {};
    }

    let cancelled = false;
    let attempts = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let didFocus = false;

    const tryFocus = (): boolean => {
        if (cancelled || (stillWanted && !stillWanted())) {
            return true;
        }

        const el = document.getElementById(COMMUNITY_POST_COMMENT_COMPOSER_ID);
        if (!el) {
            return false;
        }

        el.scrollIntoView({ behavior, block: "center" });
        el.querySelector("textarea")?.focus({ preventScroll: true });

        if (!didFocus) {
            didFocus = true;
            onFocused?.();
        }

        // Long posts / media can reflow after the first scroll.
        timeoutId = setTimeout(() => {
            if (cancelled || (stillWanted && !stillWanted())) {
                return;
            }
            el.scrollIntoView({ behavior, block: "center" });
        }, 200);

        return true;
    };

    const schedule = () => {
        if (cancelled) {
            return;
        }
        if (tryFocus()) {
            return;
        }
        attempts += 1;
        if (attempts >= maxAttempts) {
            return;
        }
        timeoutId = setTimeout(schedule, intervalMs);
    };

    const frame = window.requestAnimationFrame(schedule);

    return () => {
        cancelled = true;
        window.cancelAnimationFrame(frame);
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    };
}
