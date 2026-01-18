export interface OngoingSequence {
    id?: string;
    domain?: string;
    sequenceId: string;
    userId: string;
    // nextEmailId: string;
    nextEmailScheduledTime: number;
    retryCount: number;
    sentEmailIds: string[];
    createdAt?: Date;
    updatedAt?: Date;
}
