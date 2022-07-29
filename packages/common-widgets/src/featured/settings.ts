import { PageTypeProduct, PageTypeSite } from "@courselit/common-models";

export default interface Settings {
    entityId: string;
    type: PageTypeProduct | PageTypeSite;
    productId?: string;
    title?: string;
    description?: string;
    buttonCaption?: string;
    buttonAction?: string;
    alignment?: "top" | "bottom" | "left" | "right";
    backgroundColor?: string;
    color?: string;
}
