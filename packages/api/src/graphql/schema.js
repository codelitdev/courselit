const graphql = require("graphql");

const users = require("./users");
const lessons = require("./lessons");
const courses = require("./courses");
const siteinfo = require("./siteinfo");
const media = require("./media");
const design = require("./design");
const navigation = require("./navigation");
const widgets = require("./widgets");

module.exports = new graphql.GraphQLSchema({
  query: new graphql.GraphQLObjectType({
    name: "RootQuery",
    fields: {
      ...users.queries,
      ...lessons.queries,
      ...courses.queries,
      ...siteinfo.queries,
      ...media.queries,
      ...design.queries,
      ...navigation.queries,
      ...widgets.queries,
    },
  }),
  mutation: new graphql.GraphQLObjectType({
    name: "RootMutation",
    fields: {
      ...users.mutations,
      ...lessons.mutations,
      ...courses.mutations,
      ...siteinfo.mutations,
      ...media.mutations,
      ...design.mutations,
      ...navigation.mutations,
      ...widgets.mutations,
    },
  }),
});
