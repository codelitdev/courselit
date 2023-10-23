import Filter from "./filter";

export default interface Segment {
    name: string;
    filters: Filter[];
    segmentId: string;
}
