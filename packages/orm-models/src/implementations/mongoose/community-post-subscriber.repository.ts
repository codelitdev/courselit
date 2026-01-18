import { MongooseRepository } from "./base.repository";
import {
    CommunityPostSubscriberRepository,
    CommunityPostSubscriber,
} from "../../contracts/community-post-subscriber.repository";
import { InternalCommunityPostSubscriber } from "../../models/community-post-subscriber";
import mongoose, { Model } from "mongoose";

export class MongooseCommunityPostSubscriberRepository
    extends MongooseRepository<
        CommunityPostSubscriber,
        InternalCommunityPostSubscriber
    >
    implements CommunityPostSubscriberRepository
{
    constructor(model: Model<InternalCommunityPostSubscriber>) {
        super(model);
    }

    protected toEntity(
        doc: InternalCommunityPostSubscriber,
    ): CommunityPostSubscriber {
        return {
            ...doc,
            id: doc._id.toString(),
            domain: doc.domain.toString(),
        } as unknown as CommunityPostSubscriber;
    }

    async findBySubscriptionId(
        subscriptionId: string,
        domainId: string,
    ): Promise<CommunityPostSubscriber | null> {
        const doc = await this.model
            .findOne({ subscriptionId, domain: domainId })
            .lean();
        return doc
            ? this.toEntity(doc as InternalCommunityPostSubscriber)
            : null;
    }

    async findByPostAndUser(
        postId: string,
        userId: string,
        domainId: string,
    ): Promise<CommunityPostSubscriber | null> {
        const doc = await this.model
            .findOne({ postId, userId, domain: domainId })
            .lean();
        return doc
            ? this.toEntity(doc as InternalCommunityPostSubscriber)
            : null;
    }
}
