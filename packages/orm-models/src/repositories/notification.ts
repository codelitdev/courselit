import mongoose, { type Model } from "mongoose";
import { BaseRepository } from "./base";
import {
    NotificationSchema,
    type InternalNotification,
} from "../models/notification";

export class NotificationRepository extends BaseRepository<InternalNotification> {
    constructor(model?: Model<InternalNotification>) {
        super(
            model ??
                ((mongoose.models.Notification ||
                    mongoose.model(
                        "Notification",
                        NotificationSchema,
                    )) as Model<InternalNotification>),
        );
    }

    async findByUser(
        domain: mongoose.Types.ObjectId,
        userId: string,
    ): Promise<InternalNotification[]> {
        return this.find({ domain, userId });
    }
}
