import { MongooseRepository } from "./base.repository";
import { NotificationRepository } from "../../contracts/notification.repository";
import { Notification } from "@courselit/common-models";
import { InternalNotification } from "../../models/notification";
import mongoose, { Model } from "mongoose";

export class MongooseNotificationRepository
    extends MongooseRepository<Notification, InternalNotification>
    implements NotificationRepository
{
    constructor(model: Model<InternalNotification>) {
        super(model);
    }

    protected toEntity(doc: InternalNotification): Notification {
        return {
            ...doc,
            id: doc._id.toString(),
            domain: doc.domain.toString(),
        } as unknown as Notification;
    }

    async findByNotificationId(
        notificationId: string,
        domainId: string,
        userId: string,
    ): Promise<Notification | null> {
        const doc = await this.model
            .findOne({ notificationId, domain: domainId, forUserId: userId })
            .lean();
        return doc ? this.toEntity(doc as InternalNotification) : null;
    }

    async findForUser(
        userId: string,
        domainId: string,
        options: { page?: number; limit?: number },
    ): Promise<{ notifications: Notification[]; total: number }> {
        const page = options.page || 1;
        const limit = options.limit || 10;
        const skip = (page - 1) * limit;

        const query = {
            forUserId: userId,
            domain: domainId,
        };

        const docs = await this.model
            .find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await this.model.countDocuments(query);

        return {
            notifications: docs.map((doc) =>
                this.toEntity(doc as InternalNotification),
            ),
            total,
        };
    }
}
