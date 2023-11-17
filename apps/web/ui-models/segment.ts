import { UserFilterWithAggregator } from "@courselit/common-models";

export default interface Segment {
    name: string;
    filter: UserFilterWithAggregator;
    segmentId: string;
}
