import { WidgetMetadata, Constants } from "@courselit/common-models";
const { PageType } = Constants;

const metadata: WidgetMetadata = {
    name: "banner",
    displayName: "Banner",
    compatibleWith: [PageType.PRODUCT, PageType.COMMUNITY],
};

export default metadata;
