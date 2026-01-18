import { MongooseRepository } from "./base.repository";
import { EmailDeliveryRepository } from "../../contracts/email-delivery.repository";
import { InternalEmailDelivery } from "../../models/email-delivery";
import mongoose, { Model } from "mongoose";

export class MongooseEmailDeliveryRepository
    extends MongooseRepository<InternalEmailDelivery, InternalEmailDelivery>
    implements EmailDeliveryRepository
{
    constructor(model: Model<InternalEmailDelivery>) {
        super(model);
    }

    protected toEntity(doc: InternalEmailDelivery): InternalEmailDelivery {
        return doc;
    }

    async findBySequenceAndEmail(
        sequenceId: string,
        emailId: string,
        userId: string,
        domainId: string,
    ): Promise<InternalEmailDelivery | null> {
        return await this.model
            .findOne({ sequenceId, emailId, userId, domain: domainId })
            .lean();
    }
}
