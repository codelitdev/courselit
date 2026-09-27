type BroadcastSchedule = {
  status?: unknown;
  report?: { broadcast?: { lockedAt?: unknown; sentAt?: unknown } };
  emails?: Array<{ delayInMillis?: unknown }>;
};

function toEpochMillis(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value.trim()) return null;

  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) return numericValue;

  const parsedValue = Date.parse(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export function getBroadcastSentAt(
  broadcast: BroadcastSchedule | null | undefined,
): Date | null {
  const sentAt = toEpochMillis(broadcast?.report?.broadcast?.sentAt);
  return sentAt === null ? null : new Date(sentAt);
}

export function getFutureBroadcastDeliveryDate(
  broadcast: BroadcastSchedule | null | undefined,
  now = Date.now(),
): Date | null {
  const delay = toEpochMillis(broadcast?.emails?.[0]?.delayInMillis);
  const lockedAt = broadcast?.report?.broadcast?.lockedAt;

  if (lockedAt) return null;
  return delay !== null && delay > now ? new Date(delay) : null;
}

export function isBroadcastScheduled(
  broadcast: BroadcastSchedule | null | undefined,
  now = Date.now(),
): boolean {
  return (
    String(broadcast?.status ?? "").toLowerCase() === "active" &&
    getFutureBroadcastDeliveryDate(broadcast, now) !== null
  );
}
