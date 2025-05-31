import { WidgetMetadata, Constants } from "@courselit/common-models";
const { PageType } = Constants;

const metadata: WidgetMetadata = {
    name: "rich-text",
    displayName: "Rich text",
    compatibleWith: [PageType.PRODUCT, PageType.SITE, PageType.COMMUNITY],
};

export default metadata;
