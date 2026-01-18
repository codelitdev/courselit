import { Repository } from "../core/repository";
import { Notification } from "@courselit/common-models";

export interface NotificationRepository extends Repository<Notification> {
    findByNotificationId(
        notificationId: string,
        domainId: string,
        userId: string,
    ): Promise<Notification | null>;
    findForUser(
        userId: string,
        domainId: string,
        options: { page?: number; limit?: number },
    ): Promise<{ notifications: Notification[]; total: number }>;
}
