import { MongooseRepository } from "./base.repository";
import { PageRepository } from "../../contracts/page.repository";
import { Page } from "@courselit/common-models";
import { InternalPage } from "../../models/page";
import mongoose, { Model } from "mongoose";

export class MongoosePageRepository
    extends MongooseRepository<Page, InternalPage>
    implements PageRepository
{
    constructor(model: Model<InternalPage>) {
        super(model);
    }

    protected toEntity(doc: InternalPage): Page {
        return {
            ...doc,
            id: doc._id.toString(),
            domain: doc.domain.toString(),
        } as unknown as Page;
    }

    async findByPageId(pageId: string, domainId: string): Promise<Page | null> {
        const doc = await this.model
            .findOne({
                pageId,
                domain: this.castToObjectId(domainId),
            })
            .lean();
        return doc ? this.toEntity(doc as InternalPage) : null;
    }

    async findByType(type: string, domainId: string): Promise<Page[]> {
        const docs = await this.model
            .find({
                type,
                domain: this.castToObjectId(domainId),
            })
            .sort({ createdAt: -1 })
            .lean();
        return docs.map((doc) => this.toEntity(doc as InternalPage));
    }
}
