import { MongooseRepository } from "./base.repository";
import { MembershipRepository } from "../../contracts/membership.repository";
import { Membership, MembershipEntityType } from "@courselit/common-models";
import { InternalMembership } from "../../models/membership";
import mongoose, { Model } from "mongoose";

export class MongooseMembershipRepository
    extends MongooseRepository<Membership, InternalMembership>
    implements MembershipRepository
{
    constructor(model: Model<InternalMembership>) {
        super(model);
    }

    protected toEntity(doc: InternalMembership): Membership {
        return {
            ...doc,
            id: doc._id.toString(),
            domain: doc.domain.toString(),
            // Ensure no Mongoose specific fields leak if Membership interface is strict
        } as unknown as Membership;
    }

    async findByUserAndEntity(
        userId: string,
        entityId: string,
        entityType: MembershipEntityType,
        domainId: string,
    ): Promise<Membership | null> {
        const doc = await this.model
            .findOne({ userId, entityId, entityType, domain: domainId })
            .lean();
        return doc ? this.toEntity(doc as InternalMembership) : null;
    }

    async findByUser(userId: string, domainId: string): Promise<Membership[]> {
        const docs = await this.model.find({ userId, domain: domainId }).lean();
        return docs.map((doc) => this.toEntity(doc as InternalMembership));
    }

    async findByEntity(
        entityId: string,
        entityType: MembershipEntityType,
        domainId: string,
    ): Promise<Membership[]> {
        const docs = await this.model
            .find({ entityId, entityType, domain: domainId })
            .lean();
        return docs.map((doc) => this.toEntity(doc as InternalMembership));
    }
}
