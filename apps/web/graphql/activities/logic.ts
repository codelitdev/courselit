import { responses } from "../../config/strings";
import { checkIfAuthenticated } from "../../lib/graphql";
import GQLContext from "../../models/GQLContext";
import constants from "../../config/constants";
import { checkPermission } from "@courselit/utils";
const { permissions, activityTypes, analyticsDurations } = constants;
import ActivityModel, { Activity } from "../../models/Activity";
import { calculatePastDate } from "./helpers";
import { ActivityType } from "@courselit/common-models";

interface Activities {
    count: number;
    points?: { date: Date; count: number }[];
    growth?: number;
}

export const getActivities = async ({
    ctx,
    type,
    duration,
    points = false,
    growth = false,
    entityId,
}: {
    ctx: GQLContext;
    type: ActivityType;
    duration: (typeof analyticsDurations)[number];
    points?: boolean;
    growth?: boolean;
    entityId?: string;
}): Promise<Activities> => {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageSettings])) {
        throw new Error(responses.action_not_allowed);
    }

    let startFromDate = calculatePastDate(duration, ctx.subdomain);
    let extendedStartDate = growth
        ? calculatePastDate(
              duration,
              ctx.subdomain,
              new Date(startFromDate.getTime() - 1),
          )
        : startFromDate;

    // Single query for both current and previous period
    const query = {
        createdAt: { $gte: extendedStartDate },
        type,
        domain: ctx.subdomain._id,
        ...(entityId ? { entityId } : {}),
    };
    const activities: Activity[] = await ActivityModel.find(query);

    // Split activities into current and previous periods
    const currentPeriodActivities = activities.filter(
        (activity) => new Date(activity.createdAt!) >= startFromDate,
    );

    const count = currentPeriodActivities.reduce(
        (acc, activity) =>
            acc + (type === "purchased" ? activity.metadata?.cost || 0 : 1),
        0,
    );

    let result: Activities = { count };

    if (growth) {
        const previousPeriodActivities = activities.filter(
            (activity) => new Date(activity.createdAt!) < startFromDate,
        );
        const previousCount = previousPeriodActivities.reduce(
            (acc, activity) =>
                acc + (type === "purchased" ? activity.metadata?.cost || 0 : 1),
            0,
        );
        result.growth =
            previousCount === 0 && count > 0
                ? 100
                : previousCount
                  ? Number(
                        (
                            ((count - previousCount) / previousCount) *
                            100
                        ).toFixed(2),
                    )
                  : 0;
    }

    if (points) {
        const pointsMap = new Map<string, number>();
        const today = new Date();
        let date = new Date(startFromDate);

        // Pre-fill all dates with 0
        while (date <= today) {
            pointsMap.set(date.toISOString().split("T")[0], 0);
            date.setUTCDate(date.getUTCDate() + 1);
        }

        // Fill in actual values
        currentPeriodActivities.forEach((activity) => {
            const dateStr = new Date(activity.createdAt!)
                .toISOString()
                .split("T")[0];
            const currentValue = pointsMap.get(dateStr) || 0;
            pointsMap.set(
                dateStr,
                currentValue +
                    (type === "purchased" ? activity.metadata?.cost || 0 : 1),
            );
        });

        result.points = Array.from(pointsMap).map(([date, count]) => ({
            date: new Date(date),
            count,
        }));
    }

    return result;
};
