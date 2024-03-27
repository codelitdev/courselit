import { GraphQLEnumType } from "graphql";
import GQLContext from "../../models/GQLContext";
import { getActivities } from "./logic";
import types from "./types";
import constants from "../../config/constants";
const { activityTypes, analyticsDurations } = constants;

const activitiesMap = {};
for (const activityType of activityTypes) {
    activitiesMap[activityType.toUpperCase()] = { value: activityType };
}
const durationMap = {};
for (const duration of analyticsDurations) {
    durationMap[`_${duration.toUpperCase()}`] = { value: duration };
}

const activityType = new GraphQLEnumType({
    name: "ActivityType",
    values: activitiesMap,
});

const durationType = new GraphQLEnumType({
    name: "DurationType",
    values: durationMap,
});

const queries = {
    getActivities: {
        type: types.activity,
        args: {
            type: {
                type: activityType,
            },
            duration: {
                type: durationType,
            },
        },
        resolve: (
            _: any,
            {
                type,
                duration,
            }: {
                type: (typeof activityTypes)[number];
                duration: (typeof analyticsDurations)[number];
            },
            ctx: GQLContext,
        ) => getActivities({ ctx, type, duration }),
    },
};

export default queries;
