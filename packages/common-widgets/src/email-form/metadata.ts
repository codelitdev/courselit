import { WidgetMetadata, Constants } from "@courselit/common-models";
const { PageType } = Constants;

const metadata: WidgetMetadata = {
    name: "newsletter-signup",
    displayName: "Newsletter signup",
    compatibleWith: [PageType.PRODUCT, PageType.SITE, PageType.BLOG],
};

export default metadata;
