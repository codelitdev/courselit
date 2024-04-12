import { Email } from "./email";
import { SequenceReport } from "./sequence-report";
import { SequenceType } from "./sequence-type";
import { UserFilterWithAggregator } from "./user-filter-with-aggregator";
import { Constants } from ".";
import { SequenceStatus } from "./sequence-status";

interface From {
    name: string;
    email?: string;
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
    trigger: (typeof Constants.eventTypes)[number];
    status: SequenceStatus;
    data: Record<string, unknown>;
    emailsOrder: string[];
    entrants: string[];
}
