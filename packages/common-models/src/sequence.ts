import { Email } from "./email";
import { SequenceReport } from "./sequence-report";
import { SequenceType } from "./sequence-type";
import { UserFilterWithAggregator } from "./user-filter-with-aggregator";

interface BroadcastSettings {
    filter: UserFilterWithAggregator;
}

interface SequenceSettings {
    excludeFilter: UserFilterWithAggregator;
}

export interface Sequence {
    sequenceId: string;
    type: SequenceType;
    title: string;
    emails: Email[];
    report: SequenceReport;
    broadcastSettings: BroadcastSettings;
    sequenceSettings: SequenceSettings;
}
