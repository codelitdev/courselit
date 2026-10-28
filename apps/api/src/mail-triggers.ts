/**
 * Sequence triggers that react to CourseLit activity. SendLit knows nothing
 * about products or communities, so CourseLit reports this activity as
 * custom events (see `membership-events.ts`). This module translates
 * between the trigger types the admin works with and the `event:custom`
 * trigger SendLit stores.
 */

export const MailEventName = {
  PRODUCT_PURCHASED: "product purchased",
  COMMUNITY_JOINED: "community joined",
  COMMUNITY_LEFT: "community left",
} as const;
export type MailEventName = (typeof MailEventName)[keyof typeof MailEventName];

type ActivityTrigger = {
  eventName: MailEventName;
  /** Event property that `triggerData` narrows the trigger to. */
  property: "productId" | "communityId";
};

export const COURSELIT_TRIGGERS = {
  "product:purchased": {
    eventName: MailEventName.PRODUCT_PURCHASED,
    property: "productId",
  },
  "community:joined": {
    eventName: MailEventName.COMMUNITY_JOINED,
    property: "communityId",
  },
  "community:left": {
    eventName: MailEventName.COMMUNITY_LEFT,
    property: "communityId",
  },
} as const satisfies Record<string, ActivityTrigger>;

export type CourseLitTriggerType = keyof typeof COURSELIT_TRIGGERS;

function isCourseLitTrigger(value: unknown): value is CourseLitTriggerType {
  return typeof value === "string" && value in COURSELIT_TRIGGERS;
}

type TriggerFields = {
  triggerType?: string | null;
  triggerData?: string | null;
  triggerFilter?: unknown;
};

/** Rewrites a CourseLit trigger into the `event:custom` trigger SendLit
 * stores. Other triggers pass through unchanged. */
export function toSendLitTrigger<T extends TriggerFields>(input: T): T & TriggerFields {
  if (!isCourseLitTrigger(input.triggerType)) return input;
  const trigger = COURSELIT_TRIGGERS[input.triggerType];
  const entityId = input.triggerData?.trim();
  return {
    ...input,
    triggerType: "event:custom",
    triggerData: trigger.eventName,
    triggerFilter: entityId
      ? {
          aggregator: "and",
          filters: [{ key: trigger.property, condition: "is", value: entityId }],
        }
      : null,
  };
}

function filterEntityId(filter: unknown, property: string): string | null | undefined {
  if (filter === null || filter === undefined) return null;
  if (typeof filter !== "object") return undefined;
  const { aggregator, filters } = filter as {
    aggregator?: unknown;
    filters?: unknown;
  };
  if (!Array.isArray(filters)) return undefined;
  if (filters.length === 0) return null;
  if (filters.length !== 1 || (aggregator !== "and" && aggregator !== "or")) {
    return undefined;
  }
  const [condition] = filters as Array<Record<string, unknown>>;
  if (
    condition?.key !== property ||
    condition.condition !== "is" ||
    typeof condition.value !== "string"
  ) {
    return undefined;
  }
  return condition.value;
}

/** Reverses `toSendLitTrigger` for sequences that use one of CourseLit's
 * own events with a filter it can represent. Anything else, including
 * events created outside CourseLit, is returned as SendLit stores it. */
export function fromSendLitTrigger<T extends TriggerFields>(sequence: T): T {
  if (!sequence || sequence.triggerType !== "event:custom") return sequence;
  for (const [triggerType, trigger] of Object.entries(COURSELIT_TRIGGERS)) {
    if (trigger.eventName !== sequence.triggerData) continue;
    const entityId = filterEntityId(sequence.triggerFilter, trigger.property);
    if (entityId === undefined) return sequence;
    return {
      ...sequence,
      triggerType,
      triggerData: entityId,
      triggerFilter: null,
    };
  }
  return sequence;
}
