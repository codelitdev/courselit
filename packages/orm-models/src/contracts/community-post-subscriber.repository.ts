import { Repository } from "../core/repository";

export interface CommunityPostSubscriber {
    id: string;
    domain: string;
    subscriptionId: string;
    postId: string;
    userId: string;
    subscription: boolean;
}

export interface CommunityPostSubscriberRepository
    extends Repository<CommunityPostSubscriber> {
    findBySubscriptionId(
        subscriptionId: string,
        domainId: string,
    ): Promise<CommunityPostSubscriber | null>;
    findByPostAndUser(
        postId: string,
        userId: string,
        domainId: string,
    ): Promise<CommunityPostSubscriber | null>;
}
