import { OngoingSequence } from "@courselit/common-models";
import { OngoingSequenceRepository } from "../../contracts/ongoing-sequence.repository";
import { MongooseRepository } from "./base.repository";
import { Model } from "mongoose";

// @ts-ignore
interface InternalOngoingSequence
    extends Document,
        Omit<OngoingSequence, "id" | "domain"> {
    _id: any;
    domain: any; // mongoose.Types.ObjectId often causes type friction, any is safer for internal cast
    createdAt: Date;
    updatedAt: Date;
}

export class MongooseOngoingSequenceRepository
    extends MongooseRepository<OngoingSequence, InternalOngoingSequence>
    implements OngoingSequenceRepository
{
    constructor(model: Model<InternalOngoingSequence>) {
        super(model);
    }

    protected toEntity(doc: InternalOngoingSequence): OngoingSequence {
        return {
            id: doc._id.toString(),
            domain: doc.domain.toString(),
            sequenceId: doc.sequenceId,
            userId: doc.userId,
            nextEmailScheduledTime: doc.nextEmailScheduledTime,
            retryCount: doc.retryCount,
            sentEmailIds: doc.sentEmailIds,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
        };
    }

    async findBySequenceId(sequenceId: string): Promise<OngoingSequence[]> {
        const docs = await this.model.find({ sequenceId }).lean().exec();
        return docs.map((d) =>
            this.toEntity(d as unknown as InternalOngoingSequence),
        );
    }

    async findByUserAndSequence(
        userId: string,
        sequenceId: string,
    ): Promise<OngoingSequence | null> {
        const doc = await this.model
            .findOne({ userId, sequenceId })
            .lean()
            .exec();
        return doc
            ? this.toEntity(doc as unknown as InternalOngoingSequence)
            : null;
    }

    async findDue(
        limitTime: number,
        retryLimit: number,
    ): Promise<OngoingSequence[]> {
        const docs = await this.model
            .find({
                nextEmailScheduledTime: { $lt: limitTime },
                retryCount: { $lt: retryLimit },
            })
            .lean()
            .exec();
        return docs.map((d) =>
            this.toEntity(d as unknown as InternalOngoingSequence),
        );
    }
}
