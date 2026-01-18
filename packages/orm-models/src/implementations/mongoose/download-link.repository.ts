import { MongooseRepository } from "./base.repository";
import { DownloadLinkRepository } from "../../contracts/download-link.repository";
import { InternalDownloadLink } from "../../models/download-link";
import mongoose, { Model } from "mongoose";

export class MongooseDownloadLinkRepository
    extends MongooseRepository<InternalDownloadLink, InternalDownloadLink>
    implements DownloadLinkRepository
{
    constructor(model: Model<InternalDownloadLink>) {
        super(model);
    }

    protected toEntity(doc: InternalDownloadLink): InternalDownloadLink {
        return doc;
    }

    async findByToken(
        token: string,
        domainId: string,
    ): Promise<InternalDownloadLink | null> {
        return await this.model.findOne({ token, domain: domainId }).lean();
    }
}
