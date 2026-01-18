import {
    Constants,
    Membership,
    UserFilterWithAggregator,
} from "@courselit/common-models";
import mongoose from "mongoose";
import { repositories } from "@courselit/orm-models";

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
}: {
    domain: mongoose.Types.ObjectId;
    filter: UserFilterWithAggregator;
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
            const memberships = await repositories.membership.findByEntity(
                value as string,
                Constants.MembershipEntityType.COURSE,
                domain.toString(),
            );

            // Map string userIds to ObjectIds because downstream logic likely expects ObjectIds for $in query on _id?
            // "userId" field in User collection?
            // "ProductCondition" defines userId: { $in: mongoose.Types.ObjectId[] }
            // So we need to cast strings to ObjectIds.
            const userIds = memberships.map(
                (m) => new mongoose.Types.ObjectId(m.userId!),
            );

            if (condition === "Has") {
                productCondition.userId = {
                    $in: userIds,
                };
            }
            if (condition === "Does not have") {
                productCondition.userId = {
                    $not: { $in: userIds },
                };
            }
            dbFilters.push(productCondition);
        }
        if (name === "community") {
            const productCondition: ProductCondition = {
                userId: { $in: [] },
            };
            const memberships = await repositories.membership.findByEntity(
                value as string,
                Constants.MembershipEntityType.COMMUNITY,
                domain.toString(),
            );
            const userIds = memberships.map(
                (m) => new mongoose.Types.ObjectId(m.userId!),
            );

            if (condition === "Member of") {
                productCondition.userId = {
                    $in: userIds,
                };
            }
            if (condition === "Not a member of") {
                productCondition.userId = {
                    $not: { $in: userIds },
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
