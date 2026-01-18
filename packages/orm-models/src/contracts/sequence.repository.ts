import { Repository } from "../core/repository";
import { Sequence } from "@courselit/common-models";

export interface SequenceRepository extends Repository<Sequence> {
    findBySequenceId(
        sequenceId: string,
        domainId: string,
    ): Promise<Sequence | null>;
    findByType(type: string, domainId: string): Promise<Sequence[]>;
    countByType(type: string, domainId: string): Promise<number>;
    addFailedReport(sequenceId: string, userId: string): Promise<void>;
}
