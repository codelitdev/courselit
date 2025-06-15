import type { ComponentType } from "react";

export interface BlockMetadata {
    name: string;
    displayName: string;
    description?: string;
    icon?: ComponentType<{ className?: string }>;
    category?: string;
}

export interface BlockComponent {
    block: any;
    settings: any;
    metadata: BlockMetadata;
}

export interface BlockRegistry {
    [key: string]: BlockComponent;
}
