import React, { useState, useContext } from "react";
import { Theme } from "@courselit/common-models";
import { ExpandMoreRight } from "@courselit/icons";
import { ColorSelector } from "@courselit/components-library";
import { capitalize, FetchBuilder } from "@courselit/utils";
import {
    Columns3,
    PaletteIcon,
    SquareMousePointer,
    Type,
    ChevronLeft,
    ChevronDown,
} from "lucide-react";
import TypographySelector from "./typography-selector";
import { toast } from "@/hooks/use-toast";
import { AddressContext } from "@components/contexts";
import { TOAST_TITLE_ERROR } from "@ui-config/strings";
import {
    InteractiveSelector,
    interactiveDisplayNames,
} from "./interactive-selector";

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
    // Headers
    header1: "Header 1",
    header2: "Header 2",
    header3: "Header 3",
    header4: "Header 4",
    preheader: "Preheader",

    // Subheaders
    subheader1: "Subheader 1",
    subheader2: "Subheader 2",

    // Body Text
    text1: "Text 1",
    text2: "Text 2",
    caption: "Caption",

    // Interactive Elements
    link: "Link",
    button: "Button Text",
    input: "Input Text",
} as const;

// Add a type for the categories
type TypographyCategory = {
    name: string;
    items: string[];
};

// Define the categories
const typographyCategories: TypographyCategory[] = [
    {
        name: "Headers",
        items: ["header1", "header2", "header3", "header4", "preheader"],
    },
    {
        name: "Subheaders",
        items: ["subheader1", "subheader2"],
    },
    {
        name: "Body Text",
        items: ["text1", "text2", "caption"],
    },
    {
        name: "Interactive Elements",
        items: ["link", "button", "input"],
    },
];

function ThemeEditor({ draftTheme, onClose, onSave }: ThemeEditorProps) {
    const [theme, setTheme] = useState<Theme>(draftTheme);
    const [navigationStack, setNavigationStack] = useState<NavigationItem[]>(
        [],
    );
    const [collapsedCategories, setCollapsedCategories] = useState<
        Record<string, boolean>
    >({});
    const address = useContext(AddressContext);

    React.useEffect(() => {
        onSave(theme);
    }, [theme, onSave]);

    const navigateTo = (item: NavigationItem) => {
        setNavigationStack((prev) => [...prev, item]);
    };

    const navigateBack = () => {
        setNavigationStack((prev) => prev.slice(0, -1));
    };

    const toggleCategory = (categoryName: string) => {
        setCollapsedCategories((prev) => ({
            ...prev,
            [categoryName]: !prev[categoryName],
        }));
    };

    const updateThemeCategory = async (
        category: "colors" | "typography" | "interactives" | "structure",
        categoryData: Record<string, string>,
    ) => {
        const query = `
        mutation ($data: JSONObject) {
            updateDraftTheme(${category}: $data) {
                draftTheme {
                    colors
                }
            }
        }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query,
                variables: {
                    data: categoryData,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            await fetch.exec();
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
        }
    };

    const getCurrentView = () => {
        const currentItem = navigationStack[navigationStack.length - 1];
        const parentItem = navigationStack[navigationStack.length - 2];

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
        if (
            parentItem?.id === "typography" &&
            currentItem.id in theme.typography
        ) {
            return (
                <TypographySelector
                    title={
                        typographyDisplayNames[currentItem.id] ||
                        capitalize(currentItem.id)
                    }
                    value={theme.typography[currentItem.id]}
                    onChange={async (value) => {
                        const updatedTypography = {
                            ...theme.typography,
                            [currentItem.id]: value,
                        };
                        setTheme({
                            ...theme,
                            typography: updatedTypography,
                        });
                        await updateThemeCategory(
                            "typography",
                            updatedTypography as unknown as Record<
                                string,
                                string
                            >,
                        );
                    }}
                />
            );
        }

        // Check if current item is an interactive item
        if (
            parentItem?.id === "interactives" &&
            currentItem.id in theme.interactives
        ) {
            return (
                <InteractiveSelector
                    title={
                        interactiveDisplayNames[currentItem.id] ||
                        capitalize(currentItem.id)
                    }
                    type={
                        currentItem.id as "button" | "link" | "card" | "input"
                    }
                    value={theme.interactives[currentItem.id]}
                    onChange={async (value) => {
                        const updatedInteractives = {
                            ...theme.interactives,
                            [currentItem.id]: value,
                        };
                        setTheme({
                            ...theme,
                            interactives: updatedInteractives,
                        });
                        await updateThemeCategory(
                            "interactives",
                            updatedInteractives as unknown as Record<
                                string,
                                string
                            >,
                        );
                    }}
                />
            );
        }

        switch (currentItem.id) {
            case "colors":
                return (
                    <div className="space-y-2 p-2">
                        {Object.keys(theme.colors)
                            .filter(
                                (color) =>
                                    ![
                                        "success",
                                        "warning",
                                        "error",
                                        "info",
                                    ].includes(color),
                            )
                            .map((color) => (
                                <ColorSelector
                                    key={color}
                                    title={capitalize(color)}
                                    value={theme.colors[color]}
                                    onChange={async (value) => {
                                        const updatedColors = {
                                            ...theme.colors,
                                            [color]: value,
                                        };
                                        setTheme({
                                            ...theme,
                                            colors: updatedColors,
                                        });
                                        await updateThemeCategory(
                                            "colors",
                                            updatedColors as unknown as Record<
                                                string,
                                                string
                                            >,
                                        );
                                    }}
                                    allowReset={false}
                                />
                            ))}
                    </div>
                );
            case "typography":
                return (
                    <div className="space-y-1 p-2">
                        {typographyCategories.map((category) => (
                            <div key={category.name} className="mb-2">
                                <button
                                    type="button"
                                    className="flex items-center w-full px-2 py-1.5 text-sm hover:bg-muted rounded transition-colors"
                                    onClick={() =>
                                        toggleCategory(category.name)
                                    }
                                >
                                    <ChevronDown
                                        className={`h-4 w-4 mr-2 transition-transform ${collapsedCategories[category.name] ? "rotate-[-90deg]" : "rotate-0"}`}
                                    />
                                    {category.name}
                                </button>
                                {!collapsedCategories[category.name] && (
                                    <div>
                                        {category.items.map(
                                            (typography, idx) => (
                                                <button
                                                    key={typography}
                                                    onClick={() =>
                                                        navigateTo({
                                                            id: typography,
                                                            label:
                                                                typographyDisplayNames[
                                                                    typography
                                                                ] ||
                                                                capitalize(
                                                                    typography,
                                                                ),
                                                        })
                                                    }
                                                    className={
                                                        `w-full flex items-center justify-between px-3 py-2 text-xs rounded-md hover:bg-muted transition-colors group` +
                                                        (idx ===
                                                        category.items.length -
                                                            1
                                                            ? " mb-4"
                                                            : "")
                                                    }
                                                >
                                                    <span className="group-hover:text-foreground transition-colors">
                                                        {typographyDisplayNames[
                                                            typography
                                                        ] ||
                                                            capitalize(
                                                                typography,
                                                            )}
                                                    </span>
                                                    <ExpandMoreRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                                                </button>
                                            ),
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                );
            case "interactives":
                return (
                    <div className="space-y-1 p-2">
                        {Object.keys(interactiveDisplayNames).map(
                            (interactive) => (
                                <button
                                    key={interactive}
                                    onClick={() =>
                                        navigateTo({
                                            id: interactive,
                                            label:
                                                interactiveDisplayNames[
                                                    interactive
                                                ] || capitalize(interactive),
                                        })
                                    }
                                    className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-md hover:bg-muted transition-colors group"
                                >
                                    <span className="group-hover:text-foreground transition-colors">
                                        {interactiveDisplayNames[interactive] ||
                                            capitalize(interactive)}
                                    </span>
                                    <ExpandMoreRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                                </button>
                            ),
                        )}
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
        <div>
            {navigationStack.length === 0 && (
                <div className="space-y-4 py-2">{getCurrentView()}</div>
            )}
            {navigationStack.length > 0 && (
                <>
                    <div
                        className="flex items-center gap-2 px-2 py-2 rounded-t-md"
                        style={{ marginTop: "-8px" }}
                    >
                        <button
                            onClick={navigateBack}
                            className="flex items-center rounded-md p-1 hover:bg-muted transition-colors focus:outline-none"
                            aria-label="Back"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-sm font-medium text-muted-foreground">
                            {navigationStack[navigationStack.length - 1].label}
                        </span>
                    </div>
                    <div className="py-2">{getCurrentView()}</div>
                </>
            )}
        </div>
    );
}

export default ThemeEditor;
