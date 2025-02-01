import constants from "@/config/constants";
import { responses } from "@config/strings";
const { permissions } = constants;

export const checkForInvalidPermissions = (userPermissions) => {
    const invalidPerms = userPermissions.filter(
        (x) => !Object.values(permissions).includes(x),
    );
    if (invalidPerms.length) {
        throw new Error(responses.invalid_permission);
    }
};
