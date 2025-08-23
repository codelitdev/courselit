import { GraphQLList, GraphQLNonNull, GraphQLString } from "graphql";
import types from "./types";
import GQLContext from "../../models/GQLContext";
import { getIncludedProducts, getPlan, getPlansForEntity } from "./logic";
import { MembershipEntityType } from "@courselit/common-models";
import userTypes from "../users/types";
import courseTypes from "../courses/types";

const queries = {
    getPaymentPlan: {
        type: types.paymentPlan,
        args: {
            id: {
                type: new GraphQLNonNull(GraphQLString),
            },
        },
        resolve: (_: any, { id }: { id: string }, context: GQLContext) =>
            getPlan({ planId: id, ctx: context }),
    },
    getPaymentPlans: {
        type: new GraphQLList(types.paymentPlan),
        args: {
            entityId: {
                type: new GraphQLNonNull(GraphQLString),
            },
            entityType: {
                type: new GraphQLNonNull(userTypes.membershipEntityType),
            },
        },
        resolve: (
            _: any,
            {
                entityId,
                entityType,
            }: { entityId: string; entityType: MembershipEntityType },
            context: GQLContext,
        ) => getPlansForEntity({ entityId, entityType, ctx: context }),
    },
    getIncludedProducts: {
        type: new GraphQLList(courseTypes.courseType),
        args: {
            entityId: {
                type: new GraphQLNonNull(GraphQLString),
            },
            entityType: {
                type: new GraphQLNonNull(userTypes.membershipEntityType),
            },
        },
        resolve: (
            _: any,
            {
                entityId,
                entityType,
            }: { entityId: string; entityType: MembershipEntityType },
            context: GQLContext,
        ) => getIncludedProducts({ entityId, entityType, ctx: context }),
    },
};

export default queries;
