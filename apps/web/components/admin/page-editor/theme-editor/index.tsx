import React, { useState } from "react";
import { Theme } from "@courselit/common-models";
import { EDIT_PAGE_BUTTON_THEME } from "../../../../ui-config/strings";
import { Cross as Close, Back, ExpandMoreRight } from "@courselit/icons";
import { IconButton, ColorSelector } from "@courselit/components-library";
import { capitalize } from "@courselit/utils";
import { Columns3, PaletteIcon, SquareMousePointer, Type } from "lucide-react";
import TypographySelector from "./typography-selector";

interface ThemeEditorProps {
    draftTheme: Theme;
    onClose: () => void;
    onSave: (theme: Theme) => void;
}

type Section = {
    id: string;
    label: string;
    icon: React.ReactNode;
};

type NavigationItem = {
    id: string;
    label: string;
    component?: React.ReactNode;
    parent?: string;
};

const sections: Section[] = [
    {
        id: "colors",
        label: "Colors",
        icon: <PaletteIcon className="h-4 w-4" />,
    },
    {
        id: "typography",
        label: "Typography",
        icon: <Type className="h-4 w-4" />,
    },
    {
        id: "interactives",
        label: "Interactives",
        icon: <SquareMousePointer className="h-4 w-4" />,
    },
    {
        id: "structure",
        label: "Structure",
        icon: <Columns3 className="h-4 w-4" />,
    },
];

const typographyDisplayNames: Record<string, string> = {
    preheader: "Preheader",
    header1: "Header 1",
    header2: "Header 2",
    header3: "Header 3",
    header4: "Header 4",
    subheader1: "Subheader 1",
    subheader2: "Subheader 2",
    text1: "Text 1",
    text2: "Text 2",
    link: "Link",
    button: "Button Text",
    input: "Input Text",
    caption: "Caption",
};

function ThemeEditor({ draftTheme, onClose, onSave }: ThemeEditorProps) {
    const [theme, setTheme] = useState<Theme>(draftTheme);
    const [navigationStack, setNavigationStack] = useState<NavigationItem[]>(
        [],
    );

    // Auto-save changes
    React.useEffect(() => {
        onSave(theme);
    }, [theme, onSave]);

    const navigateTo = (item: NavigationItem) => {
        setNavigationStack((prev) => [...prev, item]);
    };

    const navigateBack = () => {
        setNavigationStack((prev) => prev.slice(0, -1));
    };

    const getCurrentView = () => {
        const currentItem = navigationStack[navigationStack.length - 1];

        if (!currentItem) {
            // Root view - Main sections
            return (
                <div className="p-2 space-y-1">
                    {sections.map((section) => (
                        <button
                            key={section.id}
                            onClick={() =>
                                navigateTo({
                                    id: section.id,
                                    label: section.label,
                                })
                            }
                            className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="text-muted-foreground group-hover:text-foreground transition-colors">
                                    {section.icon}
                                </div>
                                <span className="group-hover:text-foreground transition-colors">
                                    {section.label}
                                </span>
                            </div>
                            <ExpandMoreRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </button>
                    ))}
                </div>
            );
        }

        // Check if current item is a typography item
        if (currentItem.id in theme.typography) {
            return (
                <TypographySelector
                    title={
                        typographyDisplayNames[currentItem.id] ||
                        capitalize(currentItem.id)
                    }
                    value={theme.typography[currentItem.id]}
                    onChange={(value) =>
                        setTheme({
                            ...theme,
                            typography: {
                                ...theme.typography,
                                [currentItem.id]: value,
                            },
                        })
                    }
                />
            );
        }

        switch (currentItem.id) {
            case "colors":
                return (
                    <div className="space-y-2 p-2">
                        {Object.keys(theme.colors).map((color) => (
                            <ColorSelector
                                key={color}
                                title={capitalize(color)}
                                value={theme.colors[color]}
                                onChange={(value) =>
                                    setTheme({
                                        ...theme,
                                        colors: {
                                            ...theme.colors,
                                            [color]: value,
                                        },
                                    })
                                }
                                allowReset={false}
                            />
                        ))}
                    </div>
                );
            case "typography":
                return (
                    <div className="space-y-1 p-2">
                        {Object.keys(theme.typography).map((typography) => (
                            <button
                                key={typography}
                                onClick={() =>
                                    navigateTo({
                                        id: typography,
                                        label:
                                            typographyDisplayNames[
                                                typography
                                            ] || capitalize(typography),
                                    })
                                }
                                className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors group"
                            >
                                <span className="group-hover:text-foreground transition-colors">
                                    {typographyDisplayNames[typography] ||
                                        capitalize(typography)}
                                </span>
                                <ExpandMoreRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                            </button>
                        ))}
                    </div>
                );
            default:
                return (
                    <p className="text-xs text-muted-foreground p-2">
                        Coming soon
                    </p>
                );
        }
    };

    return (
        <div className="flex flex-col">
            <div className="flex items-center px-2 py-3 justify-between">
                <div className="flex items-center gap-1">
                    {navigationStack.length > 0 && (
                        <button
                            onClick={navigateBack}
                            className="flex items-center text-lg font-medium"
                        >
                            <Back className="h-4 w-4" />
                        </button>
                    )}
                    <span className="text-lg font-medium">
                        {navigationStack.length === 0
                            ? EDIT_PAGE_BUTTON_THEME
                            : navigationStack[navigationStack.length - 1].label}
                    </span>
                </div>
                <IconButton onClick={onClose} variant="soft">
                    <Close fontSize="small" />
                </IconButton>
            </div>
            {getCurrentView()}
        </div>
    );
}

export default ThemeEditor;
