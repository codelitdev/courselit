import metadata from "./metadata";

interface InitProps {
    type: string;
    pageId: string;
    entityId?: string;
}
export default function init({ type, pageId, entityId }: InitProps) {
    return {
        name: metadata.name,
        settings: {
            type,
            pageId,
            entityId,
        },
    };
}
