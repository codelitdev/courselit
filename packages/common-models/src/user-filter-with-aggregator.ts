import { UserFilter } from "./user-filter";
import { UserFilterAggregator } from "./user-filter-aggregator";

export interface UserFilterWithAggregator {
    aggregator: UserFilterAggregator;
    filters: UserFilter[];
}
