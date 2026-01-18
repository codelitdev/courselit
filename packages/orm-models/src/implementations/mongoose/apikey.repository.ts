import { MongooseRepository } from "./base.repository";
import { ApiKeyRepository } from "../../contracts/apikey.repository";
import { InternalApiKey } from "../../models/apikey";
import mongoose, { Model } from "mongoose";

export class MongooseApiKeyRepository
    extends MongooseRepository<InternalApiKey, InternalApiKey>
    implements ApiKeyRepository
{
    constructor(model: Model<InternalApiKey>) {
        super(model);
    }

    protected toEntity(doc: InternalApiKey): InternalApiKey {
        return doc;
    }

    async findByName(
        name: string,
        domainId: string,
    ): Promise<InternalApiKey | null> {
        return await this.model.findOne({ name, domain: domainId }).lean();
    }
}
