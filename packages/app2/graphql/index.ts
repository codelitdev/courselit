const graphql = require("graphql");

import users from "./users";
import settings from "./settings";
import media from "./media";
import design from "./design";
import menus from "./menus";
import widgets from "./widgets";

export default new graphql.GraphQLSchema({
  query: new graphql.GraphQLObjectType({
    name: "RootQuery",
    fields: {
      ...users.queries,
      // ...lessons.queries,
      // ...courses.queries,
      ...settings.queries,
      ...media.queries,
      ...design.queries,
      ...menus.queries,
      ...widgets.queries,
    },
  }),
  mutation: new graphql.GraphQLObjectType({
    name: "RootMutation",
    fields: {
      ...users.mutations,
      // ...lessons.mutations,
      // ...courses.mutations,
      ...settings.mutations,
      ...media.mutations,
      ...design.mutations,
      ...menus.mutations,
      ...widgets.mutations,
    },
  }),
});
