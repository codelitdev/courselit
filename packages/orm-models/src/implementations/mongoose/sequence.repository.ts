import { MongooseRepository } from "./base.repository";
import { SequenceRepository } from "../../contracts/sequence.repository";
import { Sequence } from "@courselit/common-models";
import { InternalSequence } from "../../models/sequence";
import mongoose, { Model } from "mongoose";

export class MongooseSequenceRepository
    extends MongooseRepository<Sequence, InternalSequence>
    implements SequenceRepository
{
    constructor(model: Model<InternalSequence>) {
        super(model);
    }

    protected toEntity(doc: InternalSequence): Sequence {
        return {
            ...doc,
            id: doc._id.toString(),
            domain: doc.domain.toString(),
        } as unknown as Sequence;
    }

    async findBySequenceId(
        sequenceId: string,
        domainId: string,
    ): Promise<Sequence | null> {
        const doc = await this.model
            .findOne({ sequenceId, domain: domainId })
            .lean();
        return doc ? this.toEntity(doc as InternalSequence) : null;
    }

    async findByType(type: string, domainId: string): Promise<Sequence[]> {
        const docs = await this.model
            .find({ type, domain: domainId })
            .sort({ createdAt: -1 })
            .lean();
        return docs.map((doc) => this.toEntity(doc as InternalSequence));
    }

    async countByType(type: string, domainId: string): Promise<number> {
        return await this.model.countDocuments({ type, domain: domainId });
    }

    async addFailedReport(sequenceId: string, userId: string): Promise<void> {
        await this.model
            .findOneAndUpdate({ sequenceId: sequenceId }, {
                $addToSet: {
                    "report.sequence.failed": userId,
                },
            } as any)
            .exec();
    }
}
