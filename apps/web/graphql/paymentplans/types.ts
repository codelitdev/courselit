import {
    GraphQLEnumType,
    GraphQLFloat,
    GraphQLInt,
    GraphQLList,
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLString,
} from "graphql";
import { Constants } from "@courselit/common-models";
import userTypes from "../users/types";
const { PaymentPlanType } = Constants;

const paymentPlanType = new GraphQLEnumType({
    name: "PaymentPlanType",
    values: Object.fromEntries(
        Object.entries(PaymentPlanType).map(([key, value]) => [
            value,
            { value: value },
        ]),
    ),
});

const paymentPlan = new GraphQLObjectType({
    name: "PaymentPlan",
    fields: {
        planId: { type: new GraphQLNonNull(GraphQLString) },
        name: { type: new GraphQLNonNull(GraphQLString) },
        type: { type: new GraphQLNonNull(paymentPlanType) },
        entityId: { type: new GraphQLNonNull(GraphQLString) },
        entityType: {
            type: new GraphQLNonNull(userTypes.membershipEntityType),
        },
        oneTimeAmount: { type: GraphQLFloat },
        emiAmount: { type: GraphQLFloat },
        emiTotalInstallments: { type: GraphQLInt },
        subscriptionMonthlyAmount: { type: GraphQLFloat },
        subscriptionYearlyAmount: { type: GraphQLFloat },
        description: { type: GraphQLString },
        includedProducts: { type: new GraphQLList(GraphQLString) },
    },
});

const types = {
    paymentPlan,
    paymentPlanType,
};

export default types;
