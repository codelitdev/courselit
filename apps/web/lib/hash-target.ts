export const HASH_TARGET_HIGHLIGHT_CLASSES = [
    "border-border",
    "bg-accent/40",
    "shadow-sm",
    "ring-1",
    "ring-ring/20",
];

/**
 * Current URL hash target id (no leading #).
 * Uses only the first fragment so malformed `#a#b` still resolves.
 */
export const getCurrentHashTargetId = () => {
    if (typeof window === "undefined") {
        return "";
    }
    return window.location.hash.slice(1).split("#")[0] || "";
};

function applyHighlight(
    element: HTMLElement,
    highlightClasses: string[],
    highlightMs: number,
) {
    element.classList.add(...highlightClasses);
    window.setTimeout(
        () => element.classList.remove(...highlightClasses),
        highlightMs,
    );
}

/**
 * Scroll to and briefly highlight the element with the given id.
 * Returns true if the element was found and scrolled into view.
 */
export function scrollToHashTarget({
    targetId = getCurrentHashTargetId(),
    highlightClasses = HASH_TARGET_HIGHLIGHT_CLASSES,
    highlightMs = 2200,
    scrollOptions = {
        behavior: "smooth" as ScrollBehavior,
        block: "center" as ScrollLogicalPosition,
    },
}: {
    targetId?: string;
    highlightClasses?: string[];
    highlightMs?: number;
    scrollOptions?: ScrollIntoViewOptions;
} = {}): boolean {
    if (!targetId || typeof document === "undefined") {
        return false;
    }

    const element = document.getElementById(targetId);
    if (!element) {
        return false;
    }

    element.scrollIntoView(scrollOptions);
    applyHighlight(element, highlightClasses, highlightMs);
    return true;
}

/**
 * Scroll now (useEffect already runs after paint); if the node is missing,
 * retry on the next animation frame(s) for nested content. Returns a cancel
 * function for effect cleanup.
 */
export function scheduleScrollToHashTarget(
    options: {
        targetId?: string;
        highlightClasses?: string[];
        highlightMs?: number;
        scrollOptions?: ScrollIntoViewOptions;
    } = {},
): () => void {
    if (typeof window === "undefined") {
        return () => {};
    }

    // Synchronous attempt — same timing product discussions used before.
    if (scrollToHashTarget(options)) {
        return () => {};
    }

    let cancelled = false;
    let secondFrame = 0;

    const firstFrame = window.requestAnimationFrame(() => {
        if (cancelled) {
            return;
        }
        if (scrollToHashTarget(options)) {
            return;
        }
        secondFrame = window.requestAnimationFrame(() => {
            if (!cancelled) {
                scrollToHashTarget(options);
            }
        });
    });

    return () => {
        cancelled = true;
        window.cancelAnimationFrame(firstFrame);
        if (secondFrame) {
            window.cancelAnimationFrame(secondFrame);
        }
    };
}

/**
 * Set the URL hash (replacing any existing fragment) and optionally notify
 * listeners that do not receive hashchange (e.g. pushState consumers).
 */
export function focusHashTarget({
    targetId,
    eventName,
}: {
    targetId: string;
    eventName?: string;
}) {
    if (typeof window === "undefined") {
        return;
    }

    // Avoid writing `#id#id` if callers pass a leading # or stacked fragment.
    const cleanId = targetId.replace(/^#/, "").split("#")[0];
    if (!cleanId) {
        return;
    }

    const url = new URL(window.location.href);
    url.hash = cleanId;
    window.history.pushState({}, "", url.toString());

    if (eventName) {
        window.dispatchEvent(new Event(eventName));
    }
}
