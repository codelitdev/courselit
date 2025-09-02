import {
    GraphQLInt,
    GraphQLList,
    GraphQLNonNull,
    GraphQLString,
} from "graphql";
import types from "./types";
import {
    archivePaymentPlan,
    changeDefaultPlan,
    createPlan,
    updatePlan,
} from "./logic";
import {
    MembershipEntityType,
    PaymentPlanType,
} from "@courselit/common-models";
import userTypes from "../users/types";

const mutations = {
    createPlan: {
        type: types.paymentPlan,
        args: {
            name: { type: new GraphQLNonNull(GraphQLString) },
            type: { type: new GraphQLNonNull(types.paymentPlanType) },
            entityId: { type: new GraphQLNonNull(GraphQLString) },
            entityType: {
                type: new GraphQLNonNull(userTypes.membershipEntityType),
            },
            oneTimeAmount: { type: GraphQLInt },
            emiAmount: { type: GraphQLInt },
            emiTotalInstallments: { type: GraphQLInt },
            subscriptionMonthlyAmount: { type: GraphQLInt },
            subscriptionYearlyAmount: { type: GraphQLInt },
            description: { type: GraphQLString },
            includedProducts: { type: new GraphQLList(GraphQLString) },
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
                description,
                includedProducts,
            }: {
                name: string;
                type: PaymentPlanType;
                oneTimeAmount?: number;
                emiAmount?: number;
                emiTotalInstallments?: number;
                subscriptionMonthlyAmount?: number;
                subscriptionYearlyAmount?: number;
                entityId: string;
                entityType: MembershipEntityType;
                description?: string;
                includedProducts?: string[];
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
                description,
                ctx,
                includedProducts,
            }),
    },
    updatePlan: {
        type: types.paymentPlan,
        args: {
            planId: { type: new GraphQLNonNull(GraphQLString) },
            name: { type: GraphQLString },
            type: { type: types.paymentPlanType },
            oneTimeAmount: { type: GraphQLInt },
            emiAmount: { type: GraphQLInt },
            emiTotalInstallments: { type: GraphQLInt },
            subscriptionMonthlyAmount: { type: GraphQLInt },
            subscriptionYearlyAmount: { type: GraphQLInt },
            description: { type: GraphQLString },
            includedProducts: { type: new GraphQLList(GraphQLString) },
        },
        resolve: async (
            _: any,
            {
                planId,
                name,
                type,
                oneTimeAmount,
                emiAmount,
                emiTotalInstallments,
                subscriptionMonthlyAmount,
                subscriptionYearlyAmount,
                description,
                includedProducts,
            }: {
                planId: string;
                type?: PaymentPlanType;
                name?: string;
                oneTimeAmount?: number;
                emiAmount?: number;
                emiTotalInstallments?: number;
                subscriptionMonthlyAmount?: number;
                subscriptionYearlyAmount?: number;
                description?: string;
                includedProducts?: string[];
            },
            ctx: any,
        ) =>
            updatePlan({
                planId,
                name,
                type,
                oneTimeAmount,
                emiAmount,
                emiTotalInstallments,
                subscriptionMonthlyAmount,
                subscriptionYearlyAmount,
                description,
                ctx,
                includedProducts,
            }),
    },
    archivePlan: {
        type: types.paymentPlan,
        args: {
            planId: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: async (_: any, { planId }: { planId: string }, ctx: any) =>
            archivePaymentPlan({ planId, ctx }),
    },
    changeDefaultPlan: {
        type: types.paymentPlan,
        args: {
            planId: { type: new GraphQLNonNull(GraphQLString) },
            entityId: { type: new GraphQLNonNull(GraphQLString) },
            entityType: {
                type: new GraphQLNonNull(userTypes.membershipEntityType),
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
        ) => changeDefaultPlan({ planId, entityId, entityType, ctx }),
    },
};

export default mutations;
