import { WidgetMetadata, Constants } from "@courselit/common-models";
const { PageType } = Constants;

const metadata: WidgetMetadata = {
    name: "faq",
    displayName: "FAQs",
    compatibleWith: [PageType.PRODUCT, PageType.SITE, PageType.COMMUNITY],
};

export default metadata;
