import { WidgetMetadata, Constants } from "@courselit/common-models";
const { PageType } = Constants;

const metadata: WidgetMetadata = {
    name: "embed",
    displayName: "Embed",
    compatibleWith: [PageType.PRODUCT, PageType.SITE, PageType.COMMUNITY],
};

export default metadata;
