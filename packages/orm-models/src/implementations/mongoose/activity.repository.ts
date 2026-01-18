import { MongooseRepository } from "./base.repository";
import { ActivityRepository } from "../../contracts/activity.repository";
import { InternalActivity } from "../../models/activity";
import mongoose, { Model } from "mongoose";

export class MongooseActivityRepository
    extends MongooseRepository<InternalActivity, InternalActivity>
    implements ActivityRepository
{
    constructor(model: Model<InternalActivity>) {
        super(model);
    }

    protected toEntity(doc: InternalActivity): InternalActivity {
        return doc;
    }

    async findByUser(
        userId: string,
        domainId: string,
        options: { limit?: number } = {},
    ): Promise<InternalActivity[]> {
        const query = this.model.find({ userId, domain: domainId });
        if (options.limit) {
            query.limit(options.limit);
        }
        query.sort({ createdAt: -1 });
        const docs = await query.lean();
        return docs.map((doc) => this.toEntity(doc as InternalActivity));
    }

    async log(
        activity: Omit<InternalActivity, "_id" | "createdAt" | "updatedAt">,
    ): Promise<InternalActivity> {
        return await this.model.create(activity);
    }
}
