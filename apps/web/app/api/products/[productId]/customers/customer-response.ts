type UserDocument = {
    userId: string;
    email?: string;
    name?: string;
    avatar?: unknown;
};

type MembershipDocument = {
    membershipId?: string;
    userId: string;
    status?: string;
    subscriptionMethod?: string;
    subscriptionId?: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
};

type PurchaseDocument = {
    completedLessons?: string[];
    downloaded?: boolean;
    createdAt?: Date | string;
    updatedAt?: Date | string;
};

function toIsoString(value?: Date | string) {
    if (!value) {
        return undefined;
    }
    return value instanceof Date ? value.toISOString() : value;
}

export function serializeCustomer(
    user: UserDocument,
    membership?: MembershipDocument | null,
    purchase?: PurchaseDocument | null,
) {
    return {
        userId: user.userId,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        membershipId: membership?.membershipId,
        membershipStatus: membership?.status,
        subscriptionMethod: membership?.subscriptionMethod,
        subscriptionId: membership?.subscriptionId,
        completedLessons: purchase?.completedLessons,
        downloaded: purchase?.downloaded,
        enrolledAt: toIsoString(purchase?.createdAt),
        updatedAt: toIsoString(purchase?.updatedAt),
    };
}
