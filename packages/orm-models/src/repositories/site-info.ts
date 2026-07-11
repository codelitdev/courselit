import mongoose, { type Model } from "mongoose";
import type { SiteInfo } from "@courselit/common-models";
import { BaseRepository } from "./base";
import { SettingsSchema } from "../models/site-info";

type SiteInfoDocument = SiteInfo & mongoose.Document;

export class SiteInfoRepository extends BaseRepository<SiteInfoDocument> {
    constructor(model?: Model<SiteInfoDocument>) {
        super(
            model ??
                ((mongoose.models.SiteInfo ||
                    mongoose.model(
                        "SiteInfo",
                        SettingsSchema,
                    )) as Model<SiteInfoDocument>),
        );
    }
}
