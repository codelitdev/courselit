import { WidgetMetadata, Constants } from "@courselit/common-models";
const { PageType } = Constants;

const metadata: WidgetMetadata = {
    name: "footer",
    displayName: "Footer",
    compatibleWith: [
        PageType.PRODUCT,
        PageType.SITE,
        PageType.COMMUNITY,
        PageType.BLOG,
    ],
};

export default metadata;
