import Filter from "./filter";
import { FilterAggregator } from "./filter-aggregator";

interface SegmentFilter {
    aggregator: FilterAggregator;
    filters: Filter[];
}

export default interface Segment {
    name: string;
    filter: SegmentFilter;
    segmentId: string;
}
