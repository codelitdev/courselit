export function createId(textContent: string) {
    return textContent.replace(/\s/g, "-").toLowerCase();
}
