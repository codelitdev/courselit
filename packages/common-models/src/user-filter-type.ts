import { Constants } from ".";
const { userFilters: filters } = Constants;

const userFilters = [...filters] as const;

export type UserFilterType = (typeof userFilters)[number];
