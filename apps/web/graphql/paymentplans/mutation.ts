import { GraphQLInt, GraphQLNonNull, GraphQLString } from "graphql";
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
            }),
    },
    updatePlan: {
        type: types.paymentPlan,
        args: {
            planId: { type: new GraphQLNonNull(GraphQLString) },
            entityId: { type: new GraphQLNonNull(GraphQLString) },
            entityType: {
                type: new GraphQLNonNull(userTypes.membershipEntityType),
            },
            name: { type: GraphQLString },
            type: { type: types.paymentPlanType },
            oneTimeAmount: { type: GraphQLInt },
            emiAmount: { type: GraphQLInt },
            emiTotalInstallments: { type: GraphQLInt },
            subscriptionMonthlyAmount: { type: GraphQLInt },
            subscriptionYearlyAmount: { type: GraphQLInt },
            description: { type: GraphQLString },
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
                entityId,
                entityType,
                description,
            }: {
                planId: string;
                type: PaymentPlanType;
                entityId: string;
                entityType: MembershipEntityType;
                name?: string;
                oneTimeAmount?: number;
                emiAmount?: number;
                emiTotalInstallments?: number;
                subscriptionMonthlyAmount?: number;
                subscriptionYearlyAmount?: number;
                description?: string;
            },
            ctx: any,
        ) =>
            updatePlan({
                planId,
                entityId,
                entityType,
                name,
                type,
                oneTimeAmount,
                emiAmount,
                emiTotalInstallments,
                subscriptionMonthlyAmount,
                subscriptionYearlyAmount,
                description,
                ctx,
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
