import { Action } from "./action";
import { Event } from "./event";

export interface Rule {
    ruleId: string;
    event: Event;
    action: Action;
    data: Record<string, unknown>;
    active: boolean;
}
