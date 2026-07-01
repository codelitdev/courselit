export const HASH_TARGET_HIGHLIGHT_CLASSES = [
    "border-border",
    "bg-accent/40",
    "shadow-sm",
    "ring-1",
    "ring-ring/20",
];

export const getCurrentHashTargetId = () =>
    typeof window === "undefined" ? "" : window.location.hash.slice(1);

export function scrollToHashTarget({
    targetId = getCurrentHashTargetId(),
    highlightClasses = HASH_TARGET_HIGHLIGHT_CLASSES,
    highlightMs = 2200,
    scrollOptions = {
        behavior: "smooth",
        block: "center",
    },
}: {
    targetId?: string;
    highlightClasses?: string[];
    highlightMs?: number;
    scrollOptions?: ScrollIntoViewOptions;
} = {}) {
    if (!targetId) {
        return false;
    }

    const element = document.getElementById(targetId);

    if (!element) {
        return false;
    }

    element.scrollIntoView(scrollOptions);
    element.classList.add(...highlightClasses);
    window.setTimeout(
        () => element.classList.remove(...highlightClasses),
        highlightMs,
    );

    return true;
}

export function focusHashTarget({
    targetId,
    eventName,
}: {
    targetId: string;
    eventName?: string;
}) {
    const url = new URL(window.location.href);
    url.hash = targetId;
    window.history.pushState({}, "", url.toString());

    if (eventName) {
        window.dispatchEvent(new Event(eventName));
    }
}
