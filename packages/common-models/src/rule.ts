import { Event } from "./event";

export interface Rule {
    ruleId: string;
    event: Event;
    sequenceId: string;
    eventDateInMillis: number;
    eventData: string;
}
