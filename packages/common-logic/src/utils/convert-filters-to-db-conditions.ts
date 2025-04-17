import {
    Constants,
    Membership,
    UserFilterWithAggregator,
} from "@courselit/common-models";
import mongoose from "mongoose";

type EmailCondition = {
    email:
        | string
        | { $regex: string; $options: string }
        | { $not: { $regex: string; $options: string } };
};

type ProductCondition = {
    userId:
        | { $in: mongoose.Types.ObjectId[] }
        | { $not: { $in: mongoose.Types.ObjectId[] } };
};

type SubscriptionCondition = {
    subscribedToUpdates: boolean;
};

type PermissionCondition = {
    permissions: { $in: string[] } | { $nin: string[] };
};

type DateCondition = {
    $lt?: Date;
    $gte?: Date;
};

type LastActiveCondition = {
    updatedAt: DateCondition;
};

type SignedUpCondition = {
    createdAt: DateCondition;
};

type TagCondition = {
    tags: string | { $not: { $regex: string } };
};

type DBCondition =
    | EmailCondition
    | ProductCondition
    | SubscriptionCondition
    | PermissionCondition
    | LastActiveCondition
    | SignedUpCondition
    | TagCondition;

export async function convertFiltersToDBConditions({
    domain,
    filter,
    membershipModel,
}: {
    domain: mongoose.Types.ObjectId;
    filter: UserFilterWithAggregator;
    membershipModel: typeof mongoose.Model<Membership>;
}): Promise<
    | {
          $and: DBCondition[];
      }
    | {
          $or: DBCondition[];
      }
    | Record<string, unknown>
> {
    const { aggregator = "or", filters } = filter;
    const dbFilters: DBCondition[] = [];

    for (const filter of filters) {
        const { name, condition, value } = filter;
        if (name === "email") {
            const emailCondition: EmailCondition = { email: "" };
            if (condition === "Is exactly") {
                emailCondition.email = value as string;
            }
            if (condition === "Contains") {
                emailCondition.email = {
                    $regex: value as string,
                    $options: "i",
                };
            }
            if (condition === "Does not contain") {
                emailCondition.email = {
                    $not: { $regex: value as string, $options: "i" },
                };
            }
            dbFilters.push(emailCondition);
        }
        if (name === "product") {
            const productCondition: ProductCondition = {
                userId: { $in: [] },
            };
            const memberships = await membershipModel.find(
                {
                    domain,
                    entityType: Constants.MembershipEntityType.COURSE,
                    entityId: value,
                },
                {
                    userId: 1,
                },
            );
            if (condition === "Has") {
                productCondition.userId = {
                    $in: memberships.map((m) => m.userId),
                };
            }
            if (condition === "Does not have") {
                productCondition.userId = {
                    $not: { $in: memberships.map((m) => m.userId) },
                };
            }
            dbFilters.push(productCondition);
        }
        if (name === "community") {
            const productCondition: ProductCondition = {
                userId: { $in: [] },
            };
            const memberships = await membershipModel.find(
                {
                    domain,
                    entityType: Constants.MembershipEntityType.COMMUNITY,
                    entityId: value,
                },
                {
                    userId: 1,
                },
            );
            if (condition === "Member of") {
                productCondition.userId = {
                    $in: memberships.map((m) => m.userId),
                };
            }
            if (condition === "Not a member of") {
                productCondition.userId = {
                    $not: { $in: memberships.map((m) => m.userId) },
                };
            }
            dbFilters.push(productCondition);
        }
        if (name === "subscription") {
            const subscriptionCondition: SubscriptionCondition = {
                subscribedToUpdates: false,
            };
            if (condition === "Subscribed") {
                subscriptionCondition.subscribedToUpdates = true;
            }
            if (condition === "Not subscribed") {
                subscriptionCondition.subscribedToUpdates = false;
            }
            dbFilters.push(subscriptionCondition);
        }
        if (name === "permission") {
            const permissionCondition: PermissionCondition = {
                permissions: { $in: [] },
            };
            if (condition === "Has") {
                permissionCondition.permissions = { $in: [value as string] };
            }
            if (condition === "Does not have") {
                permissionCondition.permissions = { $nin: [value as string] };
            }
            dbFilters.push(permissionCondition);
        }
        if (name === "lastActive") {
            const lastActiveCondition: LastActiveCondition = {
                updatedAt: {},
            };
            const dateWithoutTime = new Date(value as string);
            dateWithoutTime.setUTCHours(0, 0, 0, 0);
            if (condition === "On") {
                const nextDateWithoutTime = new Date(
                    dateWithoutTime.getTime() + 1000 * 60 * 60 * 24,
                );
                lastActiveCondition.updatedAt = {
                    $lt: nextDateWithoutTime,
                    $gte: dateWithoutTime,
                };
            }
            if (condition === "Before") {
                lastActiveCondition.updatedAt = { $lt: dateWithoutTime };
            }
            if (condition === "After") {
                lastActiveCondition.updatedAt = { $gte: dateWithoutTime };
            }
            dbFilters.push(lastActiveCondition);
        }
        if (name === "signedUp") {
            const signedUpCondition: SignedUpCondition = {
                createdAt: {},
            };
            const dateWithoutTime = new Date(value as string);
            dateWithoutTime.setUTCHours(0, 0, 0, 0);
            if (condition === "On") {
                const nextDateWithoutTime = new Date(
                    dateWithoutTime.getTime() + 1000 * 60 * 60 * 24,
                );
                signedUpCondition.createdAt = {
                    $lt: nextDateWithoutTime,
                    $gte: dateWithoutTime,
                };
            }
            if (condition === "Before") {
                signedUpCondition.createdAt = { $lt: dateWithoutTime };
            }
            if (condition === "After") {
                signedUpCondition.createdAt = { $gte: dateWithoutTime };
            }
            dbFilters.push(signedUpCondition);
        }
        if (name === "tag") {
            const tagCondition: TagCondition = { tags: "" };
            if (condition === "Has") {
                tagCondition.tags = value as string;
            }
            if (condition === "Does not have") {
                tagCondition.tags = {
                    $not: { $regex: value as string },
                };
            }
            dbFilters.push(tagCondition);
        }
    }

    return dbFilters.length ? { [`$${aggregator}`]: dbFilters } : {};
}
