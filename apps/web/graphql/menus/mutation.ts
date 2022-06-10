import { GraphQLNonNull, GraphQLID } from "graphql";
import types from "./types";
import { saveLink, deleteLink } from "./logic";
import type GQLContext from "../../models/GQLContext";
import settingsTypes from "../settings/types";

export default {
    saveLink: {
        type: settingsTypes.domain,
        args: {
            linkData: {
                type: new GraphQLNonNull(types.linkInputType),
            },
        },
        resolve: async (_: any, { linkData }: any, context: GQLContext) =>
            saveLink(linkData, context),
    },
    deleteLink: {
        type: settingsTypes.domain,
        args: {
            id: { type: new GraphQLNonNull(GraphQLID) },
        },
        resolve: async (_: any, { id }: any, context: GQLContext) =>
            deleteLink(id, context),
    },
};
