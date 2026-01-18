import { Repository } from "../core/repository";
import { InternalActivity } from "../models/activity";

export interface ActivityRepository extends Repository<InternalActivity> {
    findByUser(
        userId: string,
        domainId: string,
        options?: { limit?: number },
    ): Promise<InternalActivity[]>;
    log(
        activity: Omit<InternalActivity, "_id" | "createdAt" | "updatedAt">,
    ): Promise<InternalActivity>;
}
