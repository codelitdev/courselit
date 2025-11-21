import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Page,
    SiteInfo,
    Typeface,
    WidgetInstance,
} from "@courselit/common-models";
import type { Address, Media, Profile, State } from "@courselit/common-models";
import { debounce, FetchBuilder, generateUniqueId } from "@courselit/utils";
import {
    EDIT_PAGE_BUTTON_DONE,
    EDIT_PAGE_BUTTON_UPDATE,
    PAGE_TITLE_EDIT_PAGE,
    EDIT_PAGE_BUTTON_SEO,
    TOAST_TITLE_ERROR,
    EDIT_PAGE_BUTTON_VIEW,
    EDIT_PAGE_BUTTON_THEME,
    EDIT_PAGE_ADD_WIDGET_TITLE,
} from "@/ui-config/strings";
import { useRouter } from "next/navigation";
import {
    generateFontString,
    moveMemberUp,
    moveMemberDown,
} from "@/ui-lib/utils";
import Template from "../../public/base-layout/template";
import dynamic from "next/dynamic";
import Head from "next/head";
import widgets from "@/ui-config/widgets";
import { Sync, CheckCircled } from "@courselit/icons";
import { Button2, Skeleton, useToast } from "@courselit/components-library";
import SeoEditor from "./seo-editor";
import { ArrowUpFromLine, Eye, LogOut, Palette, Earth } from "lucide-react";
import { cn } from "@/lib/shadcn-utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import { PanelHeader } from "./panel-header";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ThemeWithDraftState } from "./theme-editor/theme-with-draft-state";
import useThemes from "./use-themes";
import NextThemeSwitcher from "./next-theme-switcher";
import { useTheme } from "next-themes";

const EditWidget = dynamic(() => import("./edit-widget"));
const AddWidget = dynamic(() => import("./add-widget"));
const ThemeEditor = dynamic(() => import("./theme-editor/index"));

const DEBOUNCE_TIME = 500;

interface PageEditorProps {
    id: string;
    address: Address;
    profile: Profile;
    siteInfo: SiteInfo;
    typefaces: Typeface[];
    redirectTo?: string;
    state: State;
}

type LeftPaneContent =
    | "fonts"
    | "theme"
    | "editor"
    | "widgets"
    | "seo"
    | "none";

export default function PageEditor({
    id,
    address,
    profile,
    redirectTo,
    state,
}: PageEditorProps) {
    const [page, setPage] = useState<
        Partial<
            Page & {
                draftTitle?: string;
                draftDescription?: string;
                draftSocialImage?: Media;
                draftRobotsAllowed?: boolean;
            }
        >
    >({});
    const [layout, setLayout] = useState<Partial<WidgetInstance>[]>([]);
    const [selectedWidget, setSelectedWidget] = useState<string>();
    const [selectedWidgetIndex, setSelectedWidgetIndex] = useState<number>(-1);
    const [draftTypefaces, setDraftTypefaces] = useState<Typeface[]>([]);
    const [leftPaneContent, setLeftPaneContent] =
        useState<LeftPaneContent>("none");
    const [primaryFontFamily, setPrimaryFontFamily] =
        useState("Roboto, sans-serif");
    const [loading, setLoading] = useState(false);
    const [draftTheme, setDraftTheme] = useState<ThemeWithDraftState>(
        state.theme,
    );
    const { toast } = useToast();
    const [pages, setPages] = useState<Page[]>([]);
    const [loadingPages, setLoadingPages] = useState(true);
    const { theme: lastEditedTheme } = useThemes();
    const { theme: nextTheme } = useTheme();

    const router = useRouter();
    const debouncedSave = useCallback(
        debounce(
            async (pageId: string, layout: Record<string, unknown>[]) =>
                await savePage({ pageId, layout }),
            DEBOUNCE_TIME,
        ),
        [],
    );

    const fontString = generateFontString(draftTypefaces);

    const fetcher = new FetchBuilder()
        .setUrl(`${address.backend}/api/graph`)
        .setIsGraphQLEndpoint(true);

    useEffect(() => {
        loadDraftTypefaces();
        loadPage();

        loadPages();
    }, [address.backend]);

    async function loadPages() {
        setLoadingPages(true);
        const query = `
                query {
                    pages: getPages(type: SITE) {
                        pageId,
                        name,
                        entityId,
                        deleteable
                    }
                }
            `;
        const fetch = fetcher.setPayload(query).build();
        try {
            setLoadingPages(true);
            const response = await fetch.exec();
            if (response.pages) {
                setPages(response.pages);
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message || "Failed to load pages",
                variant: "destructive",
            });
        } finally {
            setLoadingPages(false);
        }
    }

    useEffect(() => {
        if (JSON.stringify(layout) !== JSON.stringify(page.draftLayout)) {
            debouncedSave(page.pageId, layout);
        }
    }, [layout]);

    useEffect(() => {
        if (draftTypefaces.length) {
            const pFontFamily = draftTypefaces.filter(
                (x) => x.section === "default",
            )[0]?.typeface;
            setPrimaryFontFamily(pFontFamily);
        }
    }, [draftTypefaces]);

    useEffect(() => {
        if (lastEditedTheme) {
            setDraftTheme(lastEditedTheme);
        }
    }, [lastEditedTheme]);

    const onItemClick = (widgetId: string) => {
        setLayout([...layout]);
        setSelectedWidget(widgetId);
    };

    const onPublish = async () => {
        const mutation = `
            mutation {
                page: publish(pageId: "${id}") {
                    pageId,
                    name,
                    type,
                    layout,
                    draftLayout,
                    pageData,
                    title,
                    description,
                    socialImage {
                        mediaId,
                        originalFileName,
                        mimeType,
                        size,
                        access,
                        file,
                        thumbnail,
                        caption
                    },
                    robotsAllowed,
                    draftTitle,
                    draftDescription,
                    draftSocialImage {
                        mediaId,
                        originalFileName,
                        mimeType,
                        size,
                        access,
                        file,
                        thumbnail,
                        caption
                    },
                    draftRobotsAllowed,
                }
            }
        `;
        await fetchPage({ query: mutation });
    };

    const loadPage = async () => {
        const query = `
        query {
            page: getPage(id: "${id}") {
                pageId,
                name,
                type,
                entityId,
                layout,
                draftLayout,
                pageData,
                title,
                description,
                socialImage {
                    mediaId,
                    originalFileName,
                    mimeType,
                    size,
                    access,
                    file,
                    thumbnail,
                    caption
                },
                robotsAllowed,
                draftTitle,
                draftDescription,
                draftSocialImage {
                    mediaId,
                    originalFileName,
                    mimeType,
                    size,
                    access,
                    file,
                    thumbnail,
                    caption
                },
                draftRobotsAllowed,
            }
        }
        `;
        await fetchPage({ query, refreshLayout: true });
    };

    const loadDraftTypefaces = async () => {
        const query = `
        { site: getSiteInfo {
                draftTypefaces {
                    section,
                    typeface,
                    fontWeights,
                    fontSize,
                    lineHeight,
                    letterSpacing,
                    case
                },
            }
        }
        `;
        const fetch = fetcher.setPayload(query).build();
        try {
            setLoading(true);
            const response = await fetch.exec();
            if (response.site.draftTypefaces) {
                setDraftTypefaces(response.site.draftTypefaces);
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const onWidgetClicked = (widgetId: string) => {
        setSelectedWidget(widgetId);
        setLeftPaneContent("editor");
    };

    const fetchPage = async ({
        query,
        variables,
        refreshLayout = false,
    }: {
        query: string;
        refreshLayout?: boolean;
        variables?: Record<string, unknown>;
    }) => {
        const fetch = fetcher.setPayload({ query, variables }).build();
        try {
            setLoading(true);
            const response = await fetch.exec();
            if (response.page) {
                const pageBeingEdited = response.page;
                if (refreshLayout) {
                    setLayout(
                        JSON.parse(JSON.stringify(pageBeingEdited.draftLayout)),
                    );
                }
                setPage(pageBeingEdited);
            } else {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: `The page does not exist.`,
                    variant: "destructive",
                });
                router.replace("/dashboard/pages");
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const savePage = async ({
        pageId,
        layout,
        title,
        description,
        socialImage,
        robotsAllowed,
    }: {
        pageId: string;
        layout?: Record<string, unknown>[];
        title?: string;
        description?: string;
        socialImage?: Media | null;
        robotsAllowed?: boolean;
    }) => {
        if (!pageId) {
            return;
        }

        setLoading(true); // Set loading to true before saving

        const mutation = `
            mutation updatePage(
                $pageId: String!,
                $layout: String,
                $title: String,
                $description: String,
                $socialImage: MediaInput,
                $robotsAllowed: Boolean
            ) {
                page: updatePage(
                    pageId: $pageId,
                    layout: $layout,
                    title: $title,
                    description: $description,
                    socialImage: $socialImage,
                    robotsAllowed: $robotsAllowed
                ) {
                    pageId,
                    name,
                    type,
                    entityId,
                    layout,
                    draftLayout,
                    pageData,
                    title,
                    description,
                    socialImage {
                        mediaId,
                        originalFileName,
                        mimeType,
                        size,
                        access,
                        file,
                        thumbnail,
                        caption
                    },
                    robotsAllowed,
                    draftTitle,
                    draftDescription,
                    draftSocialImage {
                        mediaId,
                        originalFileName,
                        mimeType,
                        size,
                        access,
                        file,
                        thumbnail,
                        caption
                    },
                    draftRobotsAllowed,
                }
            }
        `;
        await fetchPage({
            query: mutation,
            variables: {
                pageId,
                layout: JSON.stringify(layout),
                title,
                description,
                socialImage,
                robotsAllowed,
            },
        });

        setLoading(false); // Set loading to false after saving
    };

    const onWidgetSettingsChanged = (
        widgetId: string,
        settings: Record<string, unknown>,
    ) => {
        const widgetIndex = layout.findIndex(
            (widget) => widget.widgetId === widgetId,
        );
        layout[widgetIndex].settings = Object.assign(
            {},
            layout[widgetIndex].settings,
            settings,
        );
        setLayout([...layout]);
    };

    const deleteWidget = async (widgetId: string) => {
        // const widgetIndex = layout.findIndex(
        //     (widget) => widget.widgetId === widgetId,
        // );
        // layout.splice(widgetIndex, 1);
        // setLayout(layout);
        // onClose();
        // await savePage({ pageId: page.pageId!, layout });
        const mutation = `
            mutation ($pageId: String!, $blockId: String!) {
                page: deleteBlock(pageId: $pageId, blockId: $blockId) {
                    pageId,
                    draftLayout,
                }
            }
        `;
        try {
            const fetch = fetcher
                .setPayload({
                    query: mutation,
                    variables: { pageId: page.pageId!, blockId: widgetId },
                })
                .build();
            const response = await fetch.exec();
            if (response.page) {
                // setPage(response.page);
                setLayout(response.page.draftLayout);
                onClose();
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const addWidget = async (name: string) => {
        const widgetId = generateUniqueId();
        layout.splice(selectedWidgetIndex + 1, 0, {
            widgetId,
            name,
            shared: widgets[name].shared,
            deleteable: true,
            settings: {
                pageId: page.pageId,
                type: page.type,
                entityId: page.entityId,
            },
        });
        setLayout(layout);
        //setShowWidgetSelector(false);
        onItemClick(widgetId);
        setLeftPaneContent("editor");
        await savePage({ pageId: page.pageId!, layout: [...layout] });
    };

    const onClose = () => {
        setSelectedWidget(undefined);
        setLeftPaneContent("none");
    };

    const selectedWidgetInstance = useMemo(
        () => layout.find((x) => x.widgetId === selectedWidget),
        [layout, selectedWidget],
    );

    const hasEditableSelectedWidget = isEditableWidget(selectedWidgetInstance);

    const editWidget = useMemo(() => {
        if (!page || !selectedWidget || !hasEditableSelectedWidget) {
            return null;
        }

        return (
            <EditWidget
                widget={selectedWidgetInstance}
                pageData={page.pageData || {}}
                onChange={onWidgetSettingsChanged}
                onClose={onClose}
                onDelete={deleteWidget}
                state={state}
                key={selectedWidget}
            />
        );
    }, [
        page,
        selectedWidget,
        hasEditableSelectedWidget,
        selectedWidgetInstance,
        onWidgetSettingsChanged,
        onClose,
        deleteWidget,
        state,
    ]);

    const onAddWidgetBelow = (index: number) => {
        setSelectedWidgetIndex(index);
        setLeftPaneContent("widgets");
    };
    const onMoveWidgetDown = (index: number) => {
        setLayout([...moveMemberDown(layout, index)]);
    };
    const onMoveWidgetUp = (index: number) => {
        setLayout([...moveMemberUp(layout, index)]);
    };

    const activeSidePaneContent = (
        <>
            {leftPaneContent === "widgets" && page.type && (
                <AddWidget
                    pageType={page.type}
                    onSelection={addWidget}
                    onClose={(e) => setLeftPaneContent("none")}
                />
            )}
            {leftPaneContent === "editor" && editWidget}
            {/* {leftPaneContent === "fonts" && (
                <FontsList
                    draftTypefaces={draftTypefaces}
                    onClose={onClose}
                    saveDraftTypefaces={saveDraftTypefaces}
                />
            )} */}
            {leftPaneContent === "theme" && (
                <ThemeEditor
                    onThemeChange={(theme) => {
                        setDraftTheme(theme);
                    }}
                    colorMode={nextTheme === "dark" ? "dark" : "light"}
                />
            )}
            {leftPaneContent === "seo" && (
                <SeoEditor
                    address={address}
                    profile={profile}
                    title={page.draftTitle || page.title || ""}
                    description={
                        page.draftDescription || page.description || ""
                    }
                    robotsAllowed={
                        typeof page.draftRobotsAllowed === "boolean"
                            ? page.draftRobotsAllowed
                            : typeof page.robotsAllowed === "boolean"
                              ? page.robotsAllowed
                              : true
                    }
                    socialImage={
                        page.draftSocialImage ?? page.socialImage ?? null
                    }
                    onClose={(e) => setLeftPaneContent("none")}
                    onSave={({
                        title,
                        description,
                        socialImage,
                        robotsAllowed,
                    }: {
                        title: string;
                        description: string;
                        socialImage: Media | null;
                        robotsAllowed: boolean;
                    }) =>
                        savePage({
                            pageId: page.pageId!,
                            title,
                            description,
                            socialImage,
                            robotsAllowed,
                        })
                    }
                />
            )}
        </>
    );

    if (Object.keys(page).length > 0) {
        return (
            <div className="flex flex-col h-screen bg-muted/10">
                <Head>
                    <title>{`${PAGE_TITLE_EDIT_PAGE} ${page.name || ""}`}</title>
                    {fontString && <link rel="stylesheet" href={fontString} />}
                </Head>
                <div className="fixed w-full border-b z-10 bg-background">
                    <header className="flex w-full h-14 px-6 justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-[220px]">
                                {loadingPages ? (
                                    <div className="flex flex-col gap-2">
                                        <Skeleton className="h-10 w-full rounded-md" />
                                    </div>
                                ) : pages.length > 0 && page.pageId ? (
                                    <Select
                                        value={page.pageId}
                                        onValueChange={(value) => {
                                            if (value !== page.pageId) {
                                                router.push(
                                                    `/dashboard/page/${value}`,
                                                );
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select page" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {pages.map((p) => (
                                                <SelectItem
                                                    key={p.pageId}
                                                    value={p.pageId}
                                                >
                                                    {p.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="h-10 flex items-center px-3 border rounded-md text-sm text-muted-foreground">
                                        No pages found
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                {/* <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button2
                                                onClick={() => setLeftPaneContent("fonts")}
                                                variant="outline"
                                                size="icon"
                                            >
                                                <Type className="h-4 w-4" />
                                            </Button2>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{EDIT_PAGE_BUTTON_FONTS}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider> */}
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <NextThemeSwitcher />
                                        </TooltipTrigger>
                                    </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button2
                                                onClick={() =>
                                                    setLeftPaneContent("theme")
                                                }
                                                variant="outline"
                                                size="icon"
                                            >
                                                <Palette className="h-4 w-4" />
                                            </Button2>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{EDIT_PAGE_BUTTON_THEME}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button2
                                                onClick={() =>
                                                    setLeftPaneContent("seo")
                                                }
                                                variant="outline"
                                                size="icon"
                                            >
                                                <Earth className="h-4 w-4" />
                                            </Button2>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{EDIT_PAGE_BUTTON_SEO}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                            <Separator orientation="vertical" className="h-6" />
                            <div className="flex items-center gap-3">
                                {loading ? (
                                    <Sync className="h-4 w-4 animate-spin text-muted-foreground" />
                                ) : (
                                    <CheckCircled className="h-4 w-4 text-green-500" />
                                )}
                                <Button2
                                    onClick={onPublish}
                                    size="sm"
                                    className="gap-2 whitespace-nowrap"
                                    disabled={loading}
                                >
                                    <ArrowUpFromLine className="h-4 w-4" />
                                    {EDIT_PAGE_BUTTON_UPDATE}
                                </Button2>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <a
                                                href={`/p/${page.pageId}`}
                                                target="_blank"
                                            >
                                                <Button2
                                                    variant="outline"
                                                    size="icon"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button2>
                                            </a>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{EDIT_PAGE_BUTTON_VIEW}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Link
                                                href={
                                                    redirectTo ||
                                                    (page.type === "product"
                                                        ? `/dashboard/product/${page.entityId}`
                                                        : `/dashboard/products`)
                                                }
                                            >
                                                <Button2
                                                    variant="outline"
                                                    size="icon"
                                                >
                                                    <LogOut className="h-4 w-4" />
                                                </Button2>
                                            </Link>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{EDIT_PAGE_BUTTON_DONE}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>
                    </header>
                </div>
                <div className="flex w-full h-[calc(100vh-56px)] mt-14 gap-4 p-4 bg-muted/10">
                    <div
                        className={cn(
                            "rounded-xl border bg-background/98 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm",
                            leftPaneContent === "none" ? "w-full" : "flex-1",
                        )}
                    >
                        <ScrollArea className="h-full">
                            <div className="px-2">
                                {draftTypefaces.length === 0 && (
                                    <div>
                                        <Skeleton className="w-full h-10" />
                                    </div>
                                )}
                                {draftTypefaces.length > 0 && draftTheme && (
                                    <Template
                                        layout={layout}
                                        pageData={page.pageData || {}}
                                        editing={true}
                                        onEditClick={onWidgetClicked}
                                        onAddWidgetBelow={onAddWidgetBelow}
                                        onMoveWidgetDown={onMoveWidgetDown}
                                        onMoveWidgetUp={onMoveWidgetUp}
                                        state={Object.assign({}, state, {
                                            theme: {
                                                themeId: draftTheme.id,
                                                name: draftTheme.name,
                                                theme:
                                                    draftTheme.draftTheme ||
                                                    draftTheme.theme,
                                            },
                                        })}
                                    />
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                    {leftPaneContent !== "none" && (
                        <div className="w-[300px] rounded-xl border bg-background/98 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm flex flex-col overflow-hidden">
                            <PanelHeader
                                title={
                                    leftPaneContent === "widgets"
                                        ? EDIT_PAGE_ADD_WIDGET_TITLE
                                        : leftPaneContent === "editor"
                                          ? "Edit Block"
                                          : leftPaneContent === "fonts"
                                            ? "Fonts"
                                            : leftPaneContent === "theme"
                                              ? "Theme"
                                              : leftPaneContent === "seo"
                                                ? "SEO"
                                                : ""
                                }
                                onClose={onClose}
                            />
                            <ScrollArea className="h-[calc(100%-56px)]">
                                <div className="py-2 space-y-4">
                                    {activeSidePaneContent}
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 p-4">
            <Skeleton className="w-full h-16" />
            <div className="flex gap-4">
                <Skeleton className="w-3/4 h-screen" />
                <Skeleton className="w-1/4 h-90" />
            </div>
        </div>
    );
}

function isEditableWidget(
    widget: Partial<WidgetInstance> | undefined,
): widget is WidgetInstance {
    return (
        !!widget &&
        typeof widget.name === "string" &&
        typeof widget.widgetId === "string" &&
        typeof widget.deleteable === "boolean"
    );
}
