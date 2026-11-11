/**
 * Page-builder blocks that CourseLit doesn't offer. They ship with the page
 * builder but talk to backends CourseLit doesn't have (lead capture, support
 * tickets), so on a CourseLit page they would look like they worked while
 * saving nothing. The "Newsletter signup" block collects emails instead.
 */
export const UNAVAILABLE_PAGE_BLOCKS: readonly string[] = ["email-form", "support-form"];
