const graphql = require("graphql");

const users = require("./users");
const lessons = require("./lessons");
const courses = require("./courses");
const settings = require("./settings");
const media = require("./media");
const design = require("./design");
const menus = require("./menus");
const widgets = require("./widgets");

module.exports = new graphql.GraphQLSchema({
  query: new graphql.GraphQLObjectType({
    name: "RootQuery",
    fields: {
      ...users.queries,
      ...lessons.queries,
      ...courses.queries,
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
      ...lessons.mutations,
      ...courses.mutations,
      ...settings.mutations,
      ...media.mutations,
      ...design.mutations,
      ...menus.mutations,
      ...widgets.mutations,
    },
  }),
});
