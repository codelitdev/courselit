interface SequenceReportInternal {
    subscribers?: string[];
    unsubscribers?: string[];
    failed?: string[];
}

interface BroadcastReport {
    lockedAt?: Date;
    sentAt?: Date;
}

export interface SequenceReport {
    broadcast?: BroadcastReport;
    sequence?: SequenceReportInternal;
}
