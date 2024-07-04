import { Drip } from "./drip";

export default interface Group {
    id: string;
    name: string;
    rank: number;
    collapsed: boolean;
    lessonsOrder: string[];
    drip?: Drip;
}
