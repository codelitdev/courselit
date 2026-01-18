import { MongooseRepository } from "./base.repository";
import { CommunityRepository } from "../../contracts/community.repository";
import { Community } from "@courselit/common-models";
import { InternalCommunity } from "../../models/community";
import mongoose, { Model } from "mongoose";

export class MongooseCommunityRepository
    extends MongooseRepository<Community, InternalCommunity>
    implements CommunityRepository
{
    constructor(model: Model<InternalCommunity>) {
        super(model);
    }

    protected toEntity(doc: InternalCommunity): Community {
        return {
            ...doc,
            id: doc._id.toString(),
            domain: doc.domain.toString(),
        } as unknown as Community;
    }

    async findByCommunityId(
        communityId: string,
        domainId: string,
    ): Promise<Community | null> {
        const doc = await this.model
            .findOne({ communityId, domain: domainId })
            .lean();
        return doc ? this.toEntity(doc as InternalCommunity) : null;
    }

    async findByPageId(
        pageId: string,
        domainId: string,
    ): Promise<Community | null> {
        const doc = await this.model
            .findOne({ pageId, domain: domainId })
            .lean();
        return doc ? this.toEntity(doc as InternalCommunity) : null;
    }
}
