import { responses } from "../../config/strings";
import { checkIfAuthenticated } from "../../lib/graphql";
import GQLContext from "../../models/GQLContext";
import constants from "../../config/constants";
import { checkPermission } from "@courselit/utils";
const { permissions, activityTypes, analyticsDurations } = constants;
import ActivityModel, { Activity } from "../../models/Activity";
import { Domain } from "@models/Domain";

interface Activities {
    count: number;
    points: { date: Date; count: number }[];
}

export const getActivities = async ({
    ctx,
    type,
    duration,
}: {
    ctx: GQLContext;
    type: (typeof activityTypes)[number];
    duration: (typeof analyticsDurations)[number];
}): Promise<Activities> => {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageSettings])) {
        throw new Error(responses.action_not_allowed);
    }

    const startFromDate = calculatePastDate(duration, ctx.subdomain);

    let filter = {
        createdAt: { $gte: startFromDate },
        type,
        domain: ctx.subdomain._id,
    };
    const activities: Activity[] = await ActivityModel.find(filter);

    const points = activities.length
        ? activities.reduce((acc, activity) => {
              const date = new Date(activity.createdAt)
                  .toISOString()
                  .split("T")[0];
              const numberToBeIncrementedBy =
                  type === "purchased" ? activity.metadata.cost : 1;
              if (acc[date]) {
                  acc[date] += numberToBeIncrementedBy;
              } else {
                  acc[date] = numberToBeIncrementedBy;
              }
              return acc;
          }, {})
        : {};

    const today = new Date();
    let date = new Date(startFromDate);
    const pointsSortedByDate = {};
    while (date <= today) {
        const dateStr = date.toISOString().split("T")[0];
        pointsSortedByDate[dateStr] = points[dateStr] || 0;
        date.setUTCDate(date.getUTCDate() + 1);
    }

    const result = {
        count:
            type === "purchased"
                ? addValues(pointsSortedByDate)
                : activities.length,
        points: Object.keys(pointsSortedByDate).map((date) => ({
            date: new Date(date),
            count: pointsSortedByDate[date],
        })),
    };

    return result;
};

const calculatePastDate = (
    duration: (typeof analyticsDurations)[number],
    domain: Domain,
): Date => {
    const today = new Date();
    let result: Date = new Date(today.getTime());

    switch (duration) {
        case "7d":
            result.setUTCDate(result.getUTCDate() - 7);
            break;
        case "30d":
            result.setUTCDate(result.getUTCDate() - 30);
            break;
        case "90d":
            result.setUTCDate(result.getUTCDate() - 90);
            break;
        case "1y":
            result.setUTCFullYear(result.getUTCFullYear() - 1);
            break;
        case "lifetime":
            result = new Date(domain.createdAt);
            break;
        default:
            throw new Error("Invalid duration");
    }

    return result;
};

const addValues = (obj) => {
    return Object.keys(obj).reduce((acc, date) => acc + obj[date], 0);
};
