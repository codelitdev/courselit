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
    }

    return dbFilters.length ? { [`$${aggregator}`]: dbFilters } : {};
}
