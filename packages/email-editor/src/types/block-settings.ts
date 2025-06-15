export interface TextBlockSettings {
    content: string;
    alignment?: "left" | "center" | "right" | "justify";
    fontFamily?: string;
    fontSize?: string;
    lineHeight?: string;
    textColor?: string;
    backgroundColor?: string;
}

// Button Block Settings
export interface ButtonBlockSettings {
    text: string;
    url: string;
    alignment?: "left" | "center" | "right";
    backgroundColor?: string;
    textColor?: string;
    fontSize?: string;
    fontWeight?: string;
    paddingX?: string;
    paddingY?: string;
    borderRadius?: string;
}

// Image Block Settings
export interface ImageBlockSettings {
    src: string;
    alt?: string;
    alignment?: "left" | "center" | "right";
    width?: string;
    height?: string;
    maxWidth?: string;
    borderRadius?: string;
    borderWidth?: string;
    borderStyle?: string;
    borderColor?: string;
    backgroundColor?: string;
    padding?: string;
}

// Separator Block Settings
export interface SeparatorBlockSettings {
    color?: string;
    thickness?: string;
    style?: "solid" | "dashed" | "dotted" | "double";
    marginY?: string;
}

// Columns Block Settings
export interface ColumnsBlockSettings {
    columns: number;
    content: string[];
    gap?: string;
    templateId?: string;
    showImages?: boolean;
    showButtons?: boolean;
    backgroundColor?: string;

    // Image settings
    imageStyle?: "cover" | "contain" | "rounded" | "circle";
    imageHeight?: string;

    // Button settings
    buttonStyle?: "primary" | "dark" | "success" | "outline" | "ghost";
    buttonSize?: "small" | "medium" | "large";
    defaultButtonText?: string;

    // Card settings
    cardStyle?: "shadow" | "border" | "flat" | "elevated";

    // Text settings
    textColor?: "white" | "dark" | "light";

    // Overlay settings
    overlayOpacity?: string;
    overlayBlur?: boolean;

    // Layout settings
    layoutDirection?: "row" | "row-reverse" | "column";

    // Icon settings
    iconBackground?: "colored" | "gray" | "none";

    // Dynamic properties for column-specific settings
    [key: string]: any; // For dynamic properties like imageUrl0, buttonText1, etc.
}
