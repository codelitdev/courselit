export type SequenceSubscriber = {
  contactId: string;
  email: string | null;
  name: string | null;
  subscribed: boolean | null;
};

export const SUBSCRIBERS_PAGE_SIZE = 10;

/** What to call a contact in the list: name, else email, else a placeholder for
 * one that has since been deleted. */
export function subscriberLabel(subscriber: SequenceSubscriber): string {
  return subscriber.name?.trim() || subscriber.email || "Deleted contact";
}

export function subscriberInitial(subscriber: SequenceSubscriber): string {
  const label = subscriber.name?.trim() || subscriber.email;
  return label ? Array.from(label)[0]!.toUpperCase() : "?";
}

export function subscriberStatus(subscriber: SequenceSubscriber): string | null {
  if (subscriber.subscribed === null) return null;
  return subscriber.subscribed ? "Subscribed" : "Unsubscribed";
}

export function totalPages(total: number, pageSize = SUBSCRIBERS_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(Math.max(total, 0) / pageSize));
}

/** "1–10 of 25" style range for the current page. */
export function pageRange(
  page: number,
  total: number,
  pageSize = SUBSCRIBERS_PAGE_SIZE,
): string {
  if (total <= 0) return "0 of 0";
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return `${from}–${to} of ${total}`;
}
