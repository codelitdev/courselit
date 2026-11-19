import { Drip } from "./drip";
import type { Instructor } from "./instructor";

export default interface Group {
    id: string;
    name: string;
    rank: number;
    collapsed: boolean;
    lessonsOrder: string[];
    drip?: Drip;
    instructors?: Instructor[];
}
