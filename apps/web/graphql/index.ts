const graphql = require("graphql");

import users from "./users";
import settings from "./settings";
import menus from "./menus";
import widgets from "./widgets";
import courses from "./courses";
import lessons from "./lessons";
import pages from "./pages";
import mails from "./mails";
import activities from "./activities";
import communities from "./communities";
import paymentplans from "./paymentplans";
import notifications from "./notifications";
import themes from "./themes";
import sitemap from "./sitemap";

const schema = new graphql.GraphQLSchema({
    query: new graphql.GraphQLObjectType({
        name: "RootQuery",
        fields: {
            ...sitemap.queries,
            ...users.queries,
            ...lessons.queries,
            ...courses.queries,
            ...settings.queries,
            ...menus.queries,
            ...widgets.queries,
            ...pages.queries,
            ...mails.queries,
            ...activities.queries,
            ...communities.queries,
            ...paymentplans.queries,
            ...notifications.queries,
            ...themes.queries,
        },
    }),
    mutation: new graphql.GraphQLObjectType({
        name: "RootMutation",
        fields: {
            ...sitemap.mutations,
            ...users.mutations,
            ...lessons.mutations,
            ...courses.mutations,
            ...settings.mutations,
            ...menus.mutations,
            ...widgets.mutations,
            ...pages.mutations,
            ...mails.mutations,
            ...activities.mutations,
            ...communities.mutations,
            ...paymentplans.mutations,
            ...notifications.mutations,
            ...themes.mutations,
        },
    }),
});

export default schema;
