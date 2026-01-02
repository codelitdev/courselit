import {
    GraphQLFloat,
    GraphQLList,
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLString,
} from "graphql";

const dataPoint = new GraphQLObjectType({
    name: "DataPoint",
    fields: {
        date: { type: new GraphQLNonNull(GraphQLString) },
        count: { type: new GraphQLNonNull(GraphQLFloat) },
    },
});

const activity = new GraphQLObjectType({
    name: "Activity",
    fields: {
        count: { type: new GraphQLNonNull(GraphQLFloat) },
        points: { type: new GraphQLList(dataPoint) },
        growth: { type: GraphQLFloat },
    },
});

export default {
    activity,
};
