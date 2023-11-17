import { UserFilterType } from "./user-filter-type";

export interface UserFilter {
    name: UserFilterType;
    condition: string;
    value: string;
    valueLabel?: string;
}
