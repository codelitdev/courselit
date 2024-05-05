export interface OngoingSequence {
    sequenceId: string;
    userId: string;
    // nextEmailId: string;
    nextEmailScheduledTime: number;
    retryCount: number;
    sentEmailIds: string[];
}
