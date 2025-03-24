import {
    GraphQLEnumType,
    GraphQLFloat,
    GraphQLInt,
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLString,
} from "graphql";
import { Constants } from "@courselit/common-models";
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
        oneTimeAmount: { type: GraphQLFloat },
        emiAmount: { type: GraphQLInt },
        emiTotalInstallments: { type: GraphQLInt },
        subscriptionMonthlyAmount: { type: GraphQLInt },
        subscriptionYearlyAmount: { type: GraphQLInt },
    },
});

const types = {
    paymentPlan,
    paymentPlanType,
};

export default types;
