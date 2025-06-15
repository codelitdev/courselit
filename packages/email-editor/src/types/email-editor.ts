export interface Style {
    colors: {
        background: string;
        foreground: string;
        border: string;
        accent: string;
        accentForeground: string;
    };
    typography: {
        header: {
            fontFamily?: string;
            fontSize?: string;
            fontWeight?: string;
            lineHeight?: string;
            letterSpacing?: string;
            textTransform?: string;
            textDecoration?: string;
        };
        text: {
            fontFamily?: string;
            fontSize?: string;
            fontWeight?: string;
            lineHeight?: string;
            letterSpacing?: string;
            textTransform?: string;
            textDecoration?: string;
        };
        link: {
            fontFamily?: string;
            fontSize?: string;
            fontWeight?: string;
            lineHeight?: string;
            letterSpacing?: string;
            textTransform?: string;
            textDecoration?: string;
        };
    };
    interactives: {
        button: {
            padding?: {
                x?: string;
                y?: string;
            };
            border?: {
                width?: string;
                radius?: string;
                style?: string;
            };
        };
        link: {
            padding?: {
                x?: string;
                y?: string;
            };
        };
    };
    structure: {
        page: {
            background?: string;
            foreground?: string;
            width?: string;
            marginY?: string;
        };
        section: {
            padding?: {
                x?: string;
                y?: string;
            };
        };
    };
}

export type BlockType = "text" | "image" | "separator" | "link";

export interface Content {
    id: string;
    blockType: BlockType;
    settings: Record<string, any>;
    style?: Partial<Style>;
}

export interface EmailMeta {
    previewText?: string;
    utm?: {
        source: string;
        medium: string;
        campaign: string;
    };
}

export interface Email {
    style: Style;
    meta: EmailMeta;
    content: Content[];
}
