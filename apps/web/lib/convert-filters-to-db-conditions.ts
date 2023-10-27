import { UserFilterWithAggregator } from "../models/UserFilter";

export default function convertFiltersToDBConditions({
    aggregator = "or",
    filters,
}: UserFilterWithAggregator):
    | {
          $and: Record<string, unknown>[];
      }
    | {
          $or: Record<string, unknown>[];
      }
    | {} {
    const dbFilters = [];

    for (let filter of filters) {
        const { name, condition, value } = filter;
        if (name === "email") {
            const emailCondition = { email: undefined };
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
            const productCondition = { "purchases.courseId": undefined };
            if (condition === "Has") {
                productCondition["purchases.courseId"] = value;
            }
            if (condition === "Does not have") {
                productCondition["purchases.courseId"] = {
                    $not: { $regex: value },
                };
            }
            dbFilters.push(productCondition);
        }
        if (name === "subscription") {
            const subscriptionCondition = { subscribedToUpdates: undefined };
            if (condition === "Subscribed") {
                subscriptionCondition.subscribedToUpdates = true;
            }
            if (condition === "Not subscribed") {
                subscriptionCondition.subscribedToUpdates = false;
            }
            dbFilters.push(subscriptionCondition);
        }
        if (name === "permission") {
            const permissionCondition = { permissions: undefined };
            if (condition === "Has") {
                permissionCondition.permissions = { $in: [value] };
            }
            if (condition === "Does not have") {
                permissionCondition.permissions = { $nin: [value] };
            }
            dbFilters.push(permissionCondition);
        }
        if (name === "lastActive") {
            const lastActiveCondition = { updatedAt: undefined };
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
            const signedUpCondition = { createdAt: undefined };
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
    }

    return dbFilters.length ? { [`$${aggregator}`]: dbFilters } : {};
}
