import constants from "@config/constants";
const { userFilters: filters } = constants;

const userFilters = [...filters] as const;

type UserFilterType = (typeof userFilters)[number];

export default UserFilterType;
