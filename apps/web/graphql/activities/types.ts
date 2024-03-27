import {
    GraphQLInt,
    GraphQLList,
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLString,
} from "graphql";

const dataPoint = new GraphQLObjectType({
    name: "DataPoint",
    fields: {
        date: { type: new GraphQLNonNull(GraphQLString) },
        count: { type: new GraphQLNonNull(GraphQLInt) },
    },
});

const activity = new GraphQLObjectType({
    name: "Activity",
    fields: {
        count: { type: new GraphQLNonNull(GraphQLInt) },
        points: { type: new GraphQLList(dataPoint) },
    },
});

export default {
    activity,
};
