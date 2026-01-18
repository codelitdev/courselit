import { Model } from "mongoose";
import { DomainRepository } from "../../contracts/domain.repository";
import { MongooseRepository } from "./base.repository";
import { Domain } from "@courselit/common-models";
import { InternalDomain } from "../../models/domain";

export class MongooseDomainRepository
    extends MongooseRepository<Domain, InternalDomain>
    implements DomainRepository
{
    constructor(model: Model<InternalDomain>) {
        super(model);
    }

    protected toEntity(doc: InternalDomain): Domain {
        // Doc is already a POJO (lean)
        return {
            ...doc,
            id: doc._id.toString(),
        } as unknown as Domain;
    }

    async findByHost(host: string): Promise<Domain | null> {
        const doc = await this.model
            .findOne({
                $or: [{ customDomain: host }, { name: host }],
            })
            .lean()
            .exec();

        return doc ? this.toEntity(doc) : null;
    }
}
