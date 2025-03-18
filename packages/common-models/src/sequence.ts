import { Email } from "./email";
import { SequenceReport } from "./sequence-report";
import { SequenceType } from "./sequence-type";
import { UserFilterWithAggregator } from "./user-filter-with-aggregator";
import { Event } from ".";
import { SequenceStatus } from "./sequence-status";

interface From {
    name: string;
    email?: string;
}

interface Trigger {
    type: Event;
    data?: string;
}

export interface Sequence {
    sequenceId: string;
    type: SequenceType;
    title?: string;
    emails: Email[];
    report: SequenceReport;
    from: From;
    filter: UserFilterWithAggregator;
    excludeFilter: UserFilterWithAggregator;
    trigger: Trigger;
    status: SequenceStatus;
    emailsOrder: string[];
    entrantsCount: number;
}
