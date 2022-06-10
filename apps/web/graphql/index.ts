const graphql = require("graphql");

import users from "./users";
import settings from "./settings";
import design from "./design";
import menus from "./menus";
import widgets from "./widgets";
import courses from "./courses";
import lessons from "./lessons";

export default new graphql.GraphQLSchema({
    query: new graphql.GraphQLObjectType({
        name: "RootQuery",
        fields: {
            ...users.queries,
            //   ...lessons.queries,
            ...courses.queries,
            ...settings.queries,
            ...design.queries,
            ...menus.queries,
            ...widgets.queries,
        },
    }),
    mutation: new graphql.GraphQLObjectType({
        name: "RootMutation",
        fields: {
            ...users.mutations,
            ...lessons.mutations,
            ...courses.mutations,
            ...settings.mutations,
            ...design.mutations,
            ...menus.mutations,
            ...widgets.mutations,
        },
    }),
});
