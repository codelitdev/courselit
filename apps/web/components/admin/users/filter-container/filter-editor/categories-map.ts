import {
    USER_FILTER_CATEGORY_EMAIL,
    USER_FILTER_CATEGORY_LAST_ACTIVE,
    USER_FILTER_CATEGORY_PERMISSION,
    USER_FILTER_CATEGORY_PRODUCT,
    USER_FILTER_CATEGORY_SIGNED_UP,
    USER_FILTER_CATEGORY_SUBSCRIPTION,
} from "@ui-config/strings";
import Filter from "@ui-models/filter";

const categoriesMap: Record<Filter["name"], string> = {
    email: USER_FILTER_CATEGORY_EMAIL,
    product: USER_FILTER_CATEGORY_PRODUCT,
    lastActive: USER_FILTER_CATEGORY_LAST_ACTIVE,
    signedUp: USER_FILTER_CATEGORY_SIGNED_UP,
    subscription: USER_FILTER_CATEGORY_SUBSCRIPTION,
    permission: USER_FILTER_CATEGORY_PERMISSION,
};

export default categoriesMap;
