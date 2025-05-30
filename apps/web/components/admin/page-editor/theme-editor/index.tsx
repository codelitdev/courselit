import React, {
    useState,
    useContext,
    useEffect,
    useCallback,
    useRef,
} from "react";
import { ExpandMoreRight } from "@courselit/icons";
import { ColorSelector } from "@courselit/components-library";
import { capitalize, FetchBuilder, truncate } from "@courselit/utils";
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
import { ThemeCard } from "./theme-card";
import { Theme } from "@courselit/page-models";
import { ThemeWithDraftState } from "./theme-with-draft-state";
import useThemes from "../use-themes";
import { ThemeCardSkeleton } from "./theme-card-skeleton";
import {
    Accordion,
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
} from "@courselit/components-library";
import { Input } from "@/components/ui/input";
import { useTheme } from "next-themes";

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

const colorOrder = ["primary", "accent", "secondary", "border"];

// const colorDisplayNames: Record<string, string> = {
//     primary: "Primary",
//     secondary: "Secondary",
//     background: "Background",
//     foreground: "Foreground",
//     card: "Card",
//     cardForeground: "Card Foreground",
//     primaryForeground: "Primary Foreground",
//     secondaryForeground: "Secondary Foreground",
//     muted: "Muted",
//     mutedForeground: "Muted Foreground",
//     accent: "Accent",
//     accentForeground: "Accent Foreground",
//     border: "Border",
//     destructive: "Destructive",
// } as const;

const colorCategories = [
    {
        key: "primary",
        label: "Primary Colors",
        colors: [
            { name: "primary", displayName: "Primary" },
            { name: "primaryForeground", displayName: "Primary Foreground" },
        ],
    },
    {
        key: "secondary",
        label: "Secondary Colors",
        colors: [
            { name: "secondary", displayName: "Secondary" },
            {
                name: "secondaryForeground",
                displayName: "Secondary Foreground",
            },
        ],
    },
    {
        key: "accent",
        label: "Accent Colors",
        colors: [
            { name: "accent", displayName: "Accent" },
            { name: "accentForeground", displayName: "Accent Foreground" },
        ],
    },
    {
        key: "base",
        label: "Base Colors",
        colors: [
            { name: "background", displayName: "Background" },
            { name: "foreground", displayName: "Foreground" },
        ],
    },
    {
        key: "card",
        label: "Card Colors",
        colors: [
            { name: "card", displayName: "Card" },
            { name: "cardForeground", displayName: "Card Foreground" },
        ],
    },
    {
        key: "popover",
        label: "Popover Colors",
        colors: [
            { name: "popover", displayName: "Popover" },
            { name: "popoverForeground", displayName: "Popover Foreground" },
        ],
    },
    {
        key: "muted",
        label: "Muted Colors",
        colors: [
            { name: "muted", displayName: "Muted" },
            { name: "mutedForeground", displayName: "Muted Foreground" },
        ],
    },
    {
        key: "border",
        label: "Border & Input Colors",
        colors: [
            { name: "border", displayName: "Border" },
            { name: "input", displayName: "Input" },
            { name: "ring", displayName: "Ring" },
        ],
    },
    {
        key: "destructive",
        label: "Destructive Colors",
        colors: [{ name: "destructive", displayName: "Destructive" }],
    },
    {
        key: "charts",
        label: "Chart Colors",
        colors: [
            { name: "chart1", displayName: "Chart 1" },
            { name: "chart2", displayName: "Chart 2" },
            { name: "chart3", displayName: "Chart 3" },
            { name: "chart4", displayName: "Chart 4" },
            { name: "chart5", displayName: "Chart 5" },
        ],
    },
    {
        key: "sidebar",
        label: "Sidebar Colors",
        colors: [
            { name: "sidebar", displayName: "Sidebar" },
            { name: "sidebarForeground", displayName: "Sidebar Foreground" },
            { name: "sidebarPrimary", displayName: "Sidebar Primary" },
            {
                name: "sidebarPrimaryForeground",
                displayName: "Sidebar Primary Foreground",
            },
            { name: "sidebarAccent", displayName: "Sidebar Accent" },
            {
                name: "sidebarAccentForeground",
                displayName: "Sidebar Accent Foreground",
            },
            { name: "sidebarBorder", displayName: "Sidebar Border" },
            { name: "sidebarRing", displayName: "Sidebar Ring" },
        ],
    },
    {
        key: "shadows",
        label: "Shadow Styles",
        colors: [
            { name: "shadow2xs", displayName: "Shadow 2XS" },
            { name: "shadowXs", displayName: "Shadow XS" },
            { name: "shadowSm", displayName: "Shadow SM" },
            { name: "shadowMd", displayName: "Shadow MD" },
            { name: "shadowLg", displayName: "Shadow LG" },
            { name: "shadowXl", displayName: "Shadow XL" },
            { name: "shadow2xl", displayName: "Shadow 2XL" },
        ],
    },
];

function ThemeEditor({
    onThemeChange,
    colorMode,
}: {
    onThemeChange: (theme: Theme) => void;
    colorMode: "light" | "dark";
}) {
    const { themes, theme, setTheme, loadThemes, loaded } = useThemes();
    const [navigationStack, setNavigationStack] = useState<NavigationItem[]>(
        [],
    );
    const [collapsedCategories, setCollapsedCategories] = useState<
        Record<string, boolean>
    >({});
    const [isLoading, setIsLoading] = useState(true);
    const address = useContext(AddressContext);
    const { theme: currentTheme, setTheme: setCurrentTheme } =
        useContext(ThemeContext);
    const selectedThemeRef = useRef<HTMLDivElement>(null);
    const [openCategory, setOpenCategory] = useState<string | null>(null);
    const { theme: nextTheme, setTheme: setNextTheme } = useTheme();

    useEffect(() => {
        if (theme) {
            onThemeChange(theme);
        }
    }, [theme]);

    useEffect(() => {
        if (loaded) {
            setIsLoading(false);
            // Scroll to selected theme after a short delay to ensure DOM is ready
            setTimeout(() => {
                if (selectedThemeRef.current) {
                    selectedThemeRef.current.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                    });
                }
            }, 100);
        }
    }, [loaded, theme?.id]);

    const navigateTo = useCallback((item: NavigationItem) => {
        setNavigationStack((prev) => [...prev, item]);
    }, []);

    const navigateBack = useCallback(() => {
        setNavigationStack((prev) => prev.slice(0, -1));
    }, []);

    const toggleCategory = useCallback((categoryName: string) => {
        setCollapsedCategories((prev) => ({
            ...prev,
            [categoryName]: !prev[categoryName],
        }));
    }, []);

    const updateThemeCategory = useCallback(
        async (
            category: "colors" | "typography" | "interactives" | "structure",
            categoryData: Record<string, string>,
        ) => {
            if (!theme) {
                return;
            }

            const query = `
        mutation ($data: JSONObject, $themeId: String!) {
            theme: updateDraftTheme(themeId: $themeId, ${category}: $data) {
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
        `;
            const fetch = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setPayload({
                    query,
                    variables: {
                        data: categoryData,
                        themeId: theme.id,
                    },
                })
                .setIsGraphQLEndpoint(true)
                .build();
            try {
                const { theme: updatedTheme } = await fetch.exec();
                if (updatedTheme) {
                    if (updatedTheme.themeId !== theme.id) {
                        const updatedThemeNew =
                            transformServerTheme(updatedTheme);
                        setTheme(updatedThemeNew);
                        loadThemes();
                    }
                }
            } catch (err: any) {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: err.message,
                    variant: "destructive",
                });
            } finally {
            }
        },
        [address.backend, theme, setCurrentTheme, loadThemes],
    );

    const switchTheme = useCallback(
        async (theme: Theme) => {
            const query = `
            mutation ($themeId: String!) {
                theme: switchTheme(themeId: $themeId) {
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
        `;
            const fetch = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setPayload({ query, variables: { themeId: theme.id } })
                .setIsGraphQLEndpoint(true)
                .build();
            try {
                const { theme: updatedTheme } = await fetch.exec();
                if (updatedTheme) {
                    const updatedThemeNew = transformServerTheme(updatedTheme);
                    setTheme(updatedThemeNew);
                    setCurrentTheme(updatedThemeNew);
                }
            } catch (error) {
                console.error(error);
            }
        },
        [address.backend, theme?.id],
    );

    const transformServerTheme = useCallback(
        (serverTheme): ThemeWithDraftState => {
            return {
                id: serverTheme.themeId,
                name: serverTheme.name,
                theme: serverTheme.theme,
                draftTheme: serverTheme.draftTheme,
            };
        },
        [],
    );

    const getCurrentView = () => {
        const currentItem = navigationStack[navigationStack.length - 1];
        const parentItem = navigationStack[navigationStack.length - 2];

        if (!currentItem) {
            // Root view - Themes list
            return (
                <div className="p-2 space-y-4">
                    {/* System Themes */}
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                        System Themes
                    </div>
                    <div className="space-y-2">
                        {isLoading
                            ? Array(3)
                                  .fill(0)
                                  .map((_, index) => (
                                      <ThemeCardSkeleton key={index} />
                                  ))
                            : themes.system.map((themeItem) => (
                                  <ThemeCard
                                      key={themeItem.id}
                                      name={truncate(themeItem.name, 30)}
                                      palette={colorOrder
                                          .map(
                                              (key) =>
                                                  themeItem.draftTheme?.colors
                                                      ?.light?.[key],
                                          )
                                          .filter(Boolean)}
                                      selected={themeItem.id === theme?.id}
                                      active={themeItem.id === currentTheme?.id}
                                      onUse={(e) => {
                                          e?.stopPropagation?.();
                                          switchTheme(themeItem);
                                      }}
                                      showUseButton={true}
                                      className="cursor-pointer"
                                      ref={
                                          themeItem.id === theme?.id
                                              ? selectedThemeRef
                                              : null
                                      }
                                      onClick={() => {
                                          setTheme(themeItem);
                                          setNavigationStack([
                                              {
                                                  id: "categories",
                                                  label: themeItem.name,
                                              },
                                          ]);
                                      }}
                                  />
                              ))}
                    </div>
                    <hr className="my-4 border-muted" />
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                        Custom Themes
                    </div>
                    <div className="space-y-2">
                        {isLoading ? (
                            Array(2)
                                .fill(0)
                                .map((_, index) => (
                                    <ThemeCardSkeleton key={index} />
                                ))
                        ) : themes.custom.length === 0 ? (
                            <div className="text-muted-foreground text-sm">
                                No custom themes yet
                            </div>
                        ) : (
                            themes.custom.map((themeItem) => (
                                <ThemeCard
                                    key={themeItem.id}
                                    name={truncate(themeItem.name, 30)}
                                    palette={colorOrder
                                        .map(
                                            (key) =>
                                                themeItem.draftTheme?.colors
                                                    ?.light?.[key],
                                        )
                                        .filter(Boolean)}
                                    selected={themeItem.id === theme?.id}
                                    active={themeItem.id === currentTheme?.id}
                                    onUse={(e) => {
                                        e?.stopPropagation?.();
                                        switchTheme(themeItem);
                                    }}
                                    showUseButton={true}
                                    className="cursor-pointer"
                                    ref={
                                        themeItem.id === theme?.id
                                            ? selectedThemeRef
                                            : null
                                    }
                                    onClick={() => {
                                        setTheme(themeItem);
                                        setNavigationStack([
                                            {
                                                id: "categories",
                                                label: themeItem.name,
                                            },
                                        ]);
                                    }}
                                />
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
            currentItem.id in (theme.draftTheme?.interactives || {})
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
                    theme={theme.draftTheme!}
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
            currentItem.id in (theme.draftTheme?.structure || {})
        ) {
            if (!theme.draftTheme) return null;
            return (
                <StructureSelector
                    title={
                        structureDisplayNames[currentItem.id] ||
                        capitalize(currentItem.id)
                    }
                    type={currentItem.id as "page" | "section"}
                    theme={theme.draftTheme}
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
                    <div>
                        <Accordion
                            type="single"
                            collapsible
                            value={openCategory ?? undefined}
                            onValueChange={setOpenCategory}
                            className="px-2"
                        >
                            {colorCategories.map((category) => (
                                <AccordionItem
                                    key={category.key}
                                    value={category.key}
                                    className="border rounded-md mb-4"
                                >
                                    <AccordionTrigger className="px-2 py-3 text-xs font-semibold rounded-t-md hover:bg-muted transition-colors hover:no-underline data-[state=open]:border-b">
                                        {category.label}
                                    </AccordionTrigger>
                                    <AccordionContent className="px-2 pb-4 pt-2">
                                        <div className="flex flex-col gap-2">
                                            {category.colors.map((color) => (
                                                <div
                                                    key={color.name}
                                                    className="mb-2"
                                                >
                                                    <div className="text-xs font-medium mb-1">
                                                        {color.displayName}
                                                    </div>
                                                    <div className="flex items-center gap-3 rounded-md">
                                                        {category.key !==
                                                            "shadows" && (
                                                            <ColorSelector
                                                                title=""
                                                                value={
                                                                    theme
                                                                        .draftTheme!
                                                                        .colors[
                                                                        colorMode
                                                                    ][
                                                                        color
                                                                            .name
                                                                    ]
                                                                }
                                                                onChange={(
                                                                    value,
                                                                ) => {
                                                                    const updatedColors =
                                                                        {
                                                                            ...theme
                                                                                .draftTheme!
                                                                                .colors,
                                                                            [colorMode]:
                                                                                {
                                                                                    ...theme
                                                                                        .draftTheme!
                                                                                        .colors[
                                                                                        colorMode
                                                                                    ],
                                                                                    [color.name]:
                                                                                        value,
                                                                                },
                                                                        };
                                                                    setTheme({
                                                                        ...theme,
                                                                        draftTheme:
                                                                            {
                                                                                ...theme.draftTheme!,
                                                                                colors: updatedColors,
                                                                            },
                                                                    });
                                                                    updateThemeCategory(
                                                                        "colors",
                                                                        updatedColors as unknown as Record<
                                                                            string,
                                                                            string
                                                                        >,
                                                                    );
                                                                }}
                                                                allowReset={
                                                                    false
                                                                }
                                                                className="w-10 h-10"
                                                            />
                                                        )}
                                                        <Input
                                                            type="text"
                                                            value={
                                                                theme
                                                                    .draftTheme!
                                                                    .colors[
                                                                    colorMode
                                                                ][color.name]
                                                            }
                                                            onChange={(e) => {
                                                                const value =
                                                                    e.target
                                                                        .value;
                                                                const updatedColors =
                                                                    {
                                                                        ...theme
                                                                            .draftTheme!
                                                                            .colors,
                                                                        [colorMode]:
                                                                            {
                                                                                ...theme
                                                                                    .draftTheme!
                                                                                    .colors[
                                                                                    colorMode
                                                                                ],
                                                                                [color.name]:
                                                                                    value,
                                                                            },
                                                                    };
                                                                setTheme({
                                                                    ...theme,
                                                                    draftTheme:
                                                                        {
                                                                            ...theme.draftTheme!,
                                                                            colors: updatedColors,
                                                                        },
                                                                });
                                                                updateThemeCategory(
                                                                    "colors",
                                                                    updatedColors as unknown as Record<
                                                                        string,
                                                                        string
                                                                    >,
                                                                );
                                                            }}
                                                            className="w-full text-sm rounded-md focus:ring-2 focus:ring-ring px-3"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
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
                        <div className="flex items-center justify-between w-full pr-2">
                            <span className="text-sm font-medium text-muted-foreground">
                                {
                                    navigationStack[navigationStack.length - 1]
                                        .label
                                }
                            </span>
                        </div>
                    </div>
                    <div className="py-2">{getCurrentView()}</div>
                </>
            )}
        </div>
    );
}

export default ThemeEditor;
