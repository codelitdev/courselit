import { WidgetMetadata, Constants } from "@courselit/common-models";
const { PageType } = Constants;

const metadata: WidgetMetadata = {
    name: "content",
    displayName: "Curriculum",
    compatibleWith: [PageType.PRODUCT],
};

export default metadata;
