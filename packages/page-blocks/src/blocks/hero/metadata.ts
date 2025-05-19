import { WidgetMetadata, Constants } from "@courselit/common-models";
const { PageType } = Constants;

const metadata: WidgetMetadata = {
    name: "hero",
    displayName: "Hero",
    compatibleWith: [
        PageType.PRODUCT,
        PageType.SITE,
        PageType.COMMUNITY,
        PageType.BLOG,
    ],
};

export default metadata;
