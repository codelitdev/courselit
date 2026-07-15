import mongoose, { type Model } from "mongoose";
import { BaseRepository } from "./base";
import { PageSchema, type InternalPage } from "../models/page";

export class PageRepository extends BaseRepository<InternalPage> {
    constructor(model?: Model<InternalPage>) {
        super(
            model ??
                ((mongoose.models.Page ||
                    mongoose.model("Page", PageSchema)) as Model<InternalPage>),
        );
    }

    async findByPageIdAndDomain(
        domain: mongoose.Types.ObjectId,
        pageId: string,
    ): Promise<InternalPage | null> {
        return this.findOne({ domain, pageId });
    }
}
