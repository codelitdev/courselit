export default interface Settings {
    entityId: string;
    productId?: string;
    title?: string;
    description?: string;
    buyButtonCaption?: string;
    alignment?: "top" | "bottom" | "left" | "right";
}
