import { OngoingSequence } from "@courselit/common-models";
import { Repository } from "../core/repository";

export interface OngoingSequenceRepository extends Repository<OngoingSequence> {
    findBySequenceId(sequenceId: string): Promise<OngoingSequence[]>;
    findByUserAndSequence(
        userId: string,
        sequenceId: string,
    ): Promise<OngoingSequence | null>;
    findDue(limitTime: number, retryLimit: number): Promise<OngoingSequence[]>;
}
