import {
    Constants,
    Membership,
    UserFilterWithAggregator,
} from "@courselit/common-models";
import mongoose from "mongoose";

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
          $and: Record<string, unknown>[];
      }
    | {
          $or: Record<string, unknown>[];
      }
    | Record<string, unknown>
> {
    const { aggregator = "or", filters } = filter;
    const dbFilters = [];

    for (const filter of filters) {
        const { name, condition, value } = filter;
        if (name === "email") {
            const emailCondition: { email: unknown } = { email: undefined };
            if (condition === "Is exactly") {
                emailCondition.email = value;
            }
            if (condition === "Contains") {
                emailCondition.email = { $regex: value, $options: "i" };
            }
            if (condition === "Does not contain") {
                emailCondition.email = {
                    $not: { $regex: value, $options: "i" },
                };
            }
            dbFilters.push(emailCondition);
        }
        if (name === "product") {
            const productCondition: { userId: unknown } = {
                userId: undefined,
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
            const productCondition: { userId: unknown } = {
                userId: undefined,
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
            const subscriptionCondition: { subscribedToUpdates: unknown } = {
                subscribedToUpdates: undefined,
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
            const permissionCondition: { permissions: unknown } = {
                permissions: undefined,
            };
            if (condition === "Has") {
                permissionCondition.permissions = { $in: [value] };
            }
            if (condition === "Does not have") {
                permissionCondition.permissions = { $nin: [value] };
            }
            dbFilters.push(permissionCondition);
        }
        if (name === "lastActive") {
            const lastActiveCondition: { updatedAt: unknown } = {
                updatedAt: undefined,
            };
            const dateWithoutTime = new Date(value);
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
            const signedUpCondition: { createdAt: unknown } = {
                createdAt: undefined,
            };
            const dateWithoutTime = new Date(value);
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
            const tagCondition: { tags: unknown } = { tags: undefined };
            if (condition === "Has") {
                tagCondition.tags = value;
            }
            if (condition === "Does not have") {
                tagCondition.tags = {
                    $not: { $regex: value },
                };
            }
            dbFilters.push(tagCondition);
        }
    }

    return dbFilters.length ? { [`$${aggregator}`]: dbFilters } : {};
}
