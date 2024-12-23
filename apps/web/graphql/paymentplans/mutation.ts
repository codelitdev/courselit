import { GraphQLInt, GraphQLNonNull, GraphQLString } from "graphql";
import types from "./types";
import { archivePaymentPlan, createPlan } from "./logic";
import { MembershipEntityType } from "@courselit/common-models";

const mutations = {
    createPlan: {
        type: types.paymentPlan,
        args: {
            name: { type: new GraphQLNonNull(GraphQLString) },
            type: { type: new GraphQLNonNull(types.paymentPlanType) },
            entityId: { type: new GraphQLNonNull(GraphQLString) },
            entityType: {
                type: new GraphQLNonNull(types.membershipEntityType),
            },
            oneTimeAmount: { type: GraphQLInt },
            emiAmount: { type: GraphQLInt },
            emiTotalInstallments: { type: GraphQLInt },
            subscriptionMonthlyAmount: { type: GraphQLInt },
            subscriptionYearlyAmount: { type: GraphQLInt },
        },
        resolve: async (
            _: any,
            {
                name,
                type,
                oneTimeAmount,
                emiAmount,
                emiTotalInstallments,
                subscriptionMonthlyAmount,
                subscriptionYearlyAmount,
                entityId,
                entityType,
            }: {
                name: string;
                type: string;
                oneTimeAmount?: number;
                emiAmount?: number;
                emiTotalInstallments?: number;
                subscriptionMonthlyAmount?: number;
                subscriptionYearlyAmount?: number;
                entityId: string;
                entityType: MembershipEntityType;
            },
            ctx: any,
        ) =>
            createPlan({
                name,
                type,
                oneTimeAmount,
                emiAmount,
                emiTotalInstallments,
                subscriptionMonthlyAmount,
                subscriptionYearlyAmount,
                entityId,
                entityType,
                ctx,
            }),
    },
    archivePlan: {
        type: types.paymentPlan,
        args: {
            planId: { type: new GraphQLNonNull(GraphQLString) },
            entityId: { type: new GraphQLNonNull(GraphQLString) },
            entityType: {
                type: new GraphQLNonNull(types.membershipEntityType),
            },
        },
        resolve: async (
            _: any,
            {
                planId,
                entityId,
                entityType,
            }: {
                planId: string;
                entityId: string;
                entityType: MembershipEntityType;
            },
            ctx: any,
        ) => archivePaymentPlan({ planId, entityId, entityType, ctx }),
    },
};

export default mutations;
