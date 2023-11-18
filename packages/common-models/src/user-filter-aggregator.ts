import { Constants } from ".";
const { userFilterAggregationOperators } = Constants;

const aggregations = [...userFilterAggregationOperators] as const;

export type UserFilterAggregator = (typeof aggregations)[number];
