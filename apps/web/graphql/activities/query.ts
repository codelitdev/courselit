import { GraphQLBoolean, GraphQLEnumType, GraphQLString } from "graphql";
import GQLContext from "../../models/GQLContext";
import { getActivities } from "./logic";
import types from "./types";
import constants from "../../config/constants";
const { activityTypes, analyticsDurations } = constants;
import { Constants as CommonConstants } from "@courselit/common-models";

const activitiesMap = {};
for (const activityType of activityTypes) {
    activitiesMap[activityType.toUpperCase()] = { value: activityType };
}
const durationMap = {};
for (const duration of analyticsDurations) {
    durationMap[`_${duration.toUpperCase()}`] = { value: duration };
}

// const activityType = new GraphQLEnumType({
//     name: "ActivityType",
//     values: Object.values(CommonConstants.ActivityType).map((type) => ({ [type]: { value: type } })),
// });

const activityType = new GraphQLEnumType({
    name: "ActivityType",
    values: Object.fromEntries(
        Object.entries(CommonConstants.ActivityType).map(([key, value]) => [
            key,
            { value },
        ]),
    ),
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
            growth: {
                type: GraphQLBoolean,
            },
            points: {
                type: GraphQLBoolean,
            },
            entityId: {
                type: GraphQLString,
            },
        },
        resolve: (
            _: any,
            {
                type,
                duration,
                growth,
                points,
                entityId,
            }: {
                type: (typeof activityTypes)[number];
                duration: (typeof analyticsDurations)[number];
                growth: boolean;
                points: boolean;
                entityId: string;
            },
            ctx: GQLContext,
        ) => getActivities({ ctx, type, duration, growth, points, entityId }),
    },
};

export default queries;
