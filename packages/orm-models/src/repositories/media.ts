import mongoose, { type Model } from "mongoose";
import { BaseRepository } from "./base";
import { MediaSchema, type MediaWithOwner } from "../models/media";

type MediaDocument = MediaWithOwner & mongoose.Document;

export class MediaRepository extends BaseRepository<MediaDocument> {
    constructor(model?: Model<MediaDocument>) {
        super(
            model ??
                ((mongoose.models.Media ||
                    mongoose.model(
                        "Media",
                        MediaSchema,
                    )) as Model<MediaDocument>),
        );
    }

    async findByMediaId(mediaId: string): Promise<MediaDocument | null> {
        return this.findOne({ mediaId });
    }
}
