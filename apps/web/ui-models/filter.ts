import UserFilterType from "../models/UserFilterType";

export default interface Filter {
    name: UserFilterType;
    condition: string;
    value: string;
    valueLabel?: string;
}
