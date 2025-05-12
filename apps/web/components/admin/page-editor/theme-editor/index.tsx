import React, { useState, useContext, useEffect } from "react";
import { UITheme } from "@courselit/common-models";
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
import { AddressContext, ThemeContext } from "@components/contexts";
import { TOAST_TITLE_ERROR } from "@ui-config/strings";
import {
    InteractiveSelector,
    interactiveDisplayNames,
} from "./interactive-selector";
import StructureSelector from "./structure-selector";

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

const structureDisplayNames: Record<string, string> = {
    page: "Page",
    section: "Section",
} as const;

const colorOrder = ["primary", "secondary", "background", "text", "border"];

function ThemeEditor() {
    const [themes, setThemes] = useState<{
        system: UITheme[];
        custom: UITheme[];
    }>({ system: [], custom: [] });
    const [theme, setTheme] = useState<UITheme | null>(null);
    const [navigationStack, setNavigationStack] = useState<NavigationItem[]>(
        [],
    );
    const [collapsedCategories, setCollapsedCategories] = useState<
        Record<string, boolean>
    >({});
    const address = useContext(AddressContext);
    const currentTheme = useContext(ThemeContext);

    useEffect(() => {
        loadThemes();
    }, []);

    const loadThemes = async () => {
        const query = `
        query {
            themes: getThemes {
                system {
                    themeId
                    name
                    theme {
                        colors  
                        typography
                        interactives
                        structure
                    }
                    draftTheme {
                        colors
                        typography
                        interactives
                        structure
                    }
                }
                custom {
                    themeId
                    name
                    theme {
                        colors
                        typography
                        interactives
                        structure
                    }
                    draftTheme {
                        colors
                        typography
                        interactives
                        structure
                    }
                }
            }
        }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({ query })
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            const { themes } = await fetch.exec();
            if (themes) {
                setThemes(themes);
            }
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        if (themes.system.length > 0 && !theme) {
            // Set the first system theme as default
            setTheme(themes.system[0]);
        }
    }, [themes.system, theme]);

    const loadTheme = async () => {
        if (!theme?.themeId) return;

        const query = `
        query {
            theme: getTheme(themeId: $themeId) {
                themeId
                name
                theme
                draftTheme
            }
        }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({ query, variables: { themeId: theme.themeId } })
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            const { theme: updatedTheme } = await fetch.exec();
            if (updatedTheme) {
                setTheme(updatedTheme);
            }
        } catch (error) {
            console.error(error);
        }
    };

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
        if (!theme) {
            return;
        }

        const query = `
        mutation ($data: JSONObject, $themeId: String!) {
            updateDraftTheme(themeId: $themeId, ${category}: $data) {
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
                    themeId: theme.themeId,
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
            // Root view - Themes list
            return (
                <div className="p-2 space-y-4">
                    {/* System Themes */}
                    <div className="text-sm font-medium text-muted-foreground mb-2 ">
                        System Themes
                    </div>
                    <div>
                        {themes.system.map((theme) => (
                            <button
                                key={theme.themeId}
                                onClick={() => {
                                    setTheme(theme);
                                    navigateTo({
                                        id: "categories",
                                        label: theme.name,
                                    });
                                }}
                                className={
                                    "w-full flex items-center justify-between px-3 py-3 rounded-md transition-colors group" +
                                    (theme === theme
                                        ? " bg-muted"
                                        : " hover:bg-muted")
                                }
                            >
                                <span className="flex items-center gap-3">
                                    <span className="flex gap-1">
                                        {colorOrder.map(
                                            (key) =>
                                                theme.theme.colors?.[key] && (
                                                    <span
                                                        key={key}
                                                        className="w-4 h-4 rounded-full border"
                                                        style={{
                                                            backgroundColor:
                                                                theme.theme
                                                                    .colors[
                                                                    key
                                                                ],
                                                        }}
                                                    />
                                                ),
                                        )}
                                    </span>
                                    <span className="font-medium text-foreground text-sm">
                                        {theme.name}
                                    </span>
                                </span>
                                <ExpandMoreRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                            </button>
                        ))}
                    </div>
                    <hr className="my-4 border-muted" />
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                        Custom Themes
                    </div>
                    <div>
                        {themes.custom.length === 0 ? (
                            <div className="text-muted-foreground text-sm">
                                No custom themes yet
                            </div>
                        ) : (
                            themes.custom.map((theme) => (
                                <button
                                    key={theme.themeId}
                                    onClick={() => {
                                        setTheme(theme);
                                        navigateTo({
                                            id: "categories",
                                            label: theme.name,
                                        });
                                    }}
                                    className={
                                        "w-full flex items-center justify-between px-3 py-3 rounded-md transition-colors group" +
                                        (theme === theme
                                            ? " bg-muted"
                                            : " hover:bg-muted")
                                    }
                                >
                                    <span className="flex items-center gap-3">
                                        <span className="flex gap-1">
                                            {colorOrder.map(
                                                (key) =>
                                                    theme.theme.colors?.[
                                                        key
                                                    ] && (
                                                        <span
                                                            key={key}
                                                            className="w-4 h-4 rounded-full border"
                                                            style={{
                                                                backgroundColor:
                                                                    theme.theme
                                                                        .colors[
                                                                        key
                                                                    ],
                                                            }}
                                                        />
                                                    ),
                                            )}
                                        </span>
                                        <span className="font-medium text-foreground text-sm">
                                            {theme.name}
                                        </span>
                                    </span>
                                    <ExpandMoreRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                                </button>
                            ))
                        )}
                    </div>
                </div>
            );
        }

        // Categories view
        if (currentItem.id === "categories") {
            if (!theme) {
                return <p>No theme selected</p>;
            }
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

        // For all other views, we need a theme
        if (!theme) {
            return <p>No theme selected</p>;
        }

        // Check if current item is a typography item
        if (
            parentItem?.id === "typography" &&
            currentItem.id in theme.draftTheme!.typography
        ) {
            return (
                <TypographySelector
                    title={
                        typographyDisplayNames[currentItem.id] ||
                        capitalize(currentItem.id)
                    }
                    value={theme.draftTheme!.typography[currentItem.id]}
                    onChange={async (value) => {
                        const updatedTypography = {
                            ...theme.draftTheme!.typography,
                            [currentItem.id]: value,
                        };
                        setTheme({
                            ...theme,
                            draftTheme: {
                                ...theme.draftTheme!,
                                typography: updatedTypography,
                            },
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
            currentItem.id in theme.draftTheme!.interactives
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
                    theme={theme.draftTheme}
                    onChange={async (updatedTheme) => {
                        setTheme({
                            ...theme,
                            draftTheme: {
                                ...theme.draftTheme!,
                                interactives: updatedTheme.interactives,
                            },
                        });
                        await updateThemeCategory(
                            "interactives",
                            updatedTheme.interactives as unknown as Record<
                                string,
                                string
                            >,
                        );
                    }}
                />
            );
        }

        // Check if current item is a structure item
        if (
            parentItem?.id === "structure" &&
            currentItem.id in theme.draftTheme!.structure
        ) {
            return (
                <StructureSelector
                    title={
                        structureDisplayNames[currentItem.id] ||
                        capitalize(currentItem.id)
                    }
                    type={currentItem.id as "page" | "section"}
                    theme={theme.draftTheme!}
                    onChange={async (updatedTheme) => {
                        setTheme({
                            ...theme,
                            draftTheme: {
                                ...theme.draftTheme!,
                                structure: updatedTheme.structure,
                            },
                        });
                        await updateThemeCategory(
                            "structure",
                            updatedTheme.structure as unknown as Record<
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
                        {Object.keys(theme.draftTheme!.colors)
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
                                    value={theme.draftTheme!.colors[color]}
                                    onChange={async (value) => {
                                        const updatedColors = {
                                            ...theme.draftTheme!.colors,
                                            [color]: value,
                                        };
                                        setTheme({
                                            ...theme,
                                            draftTheme: {
                                                ...theme.draftTheme!,
                                                colors: updatedColors,
                                            },
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
                                    <span className="text-sm font-medium text-muted-foreground">
                                        {category.name}
                                    </span>
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
            case "structure":
                return (
                    <div className="space-y-1 p-2">
                        {Object.keys(structureDisplayNames).map((structure) => (
                            <button
                                key={structure}
                                onClick={() =>
                                    navigateTo({
                                        id: structure,
                                        label:
                                            structureDisplayNames[structure] ||
                                            capitalize(structure),
                                    })
                                }
                                className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-md hover:bg-muted transition-colors group"
                            >
                                <span className="group-hover:text-foreground transition-colors">
                                    {structureDisplayNames[structure] ||
                                        capitalize(structure)}
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
