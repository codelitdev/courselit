import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Page,
    SiteInfo,
    Typeface,
    WidgetInstance,
} from "@courselit/common-models";
import type { Address, Media, Profile, Theme } from "@courselit/common-models";
import type { AppDispatch, AppState } from "@courselit/state-management";
import { networkAction } from "@courselit/state-management/dist/action-creators";
import {
    debounce,
    FetchBuilder,
    generateUniqueId,
    getGraphQLQueryStringFromObject,
} from "@courselit/utils";
import {
    EDIT_PAGE_BUTTON_DONE,
    EDIT_PAGE_BUTTON_UPDATE,
    PAGE_TITLE_EDIT_PAGE,
    EDIT_PAGE_BUTTON_SEO,
    TOAST_TITLE_ERROR,
    EDIT_PAGE_BUTTON_VIEW,
    EDIT_PAGE_BUTTON_THEME,
} from "../../../ui-config/strings";
import { useRouter } from "next/navigation";
import {
    generateFontString,
    moveMemberUp,
    moveMemberDown,
} from "../../../ui-lib/utils";
import Template from "../../public/base-layout/template";
import dynamic from "next/dynamic";
import Head from "next/head";
import widgets from "../../../ui-config/widgets";
import { Sync, CheckCircled } from "@courselit/icons";
import { Button2, Skeleton, useToast } from "@courselit/components-library";
import SeoEditor from "./seo-editor";
import { ArrowUpFromLine, Eye, LogOut, Palette, Earth } from "lucide-react";
import { cn } from "@/lib/shadcn-utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

const EditWidget = dynamic(() => import("./edit-widget"));
const AddWidget = dynamic(() => import("./add-widget"));
const FontsList = dynamic(() => import("./fonts-list"));
const ThemeEditor = dynamic(() => import("./theme-editor/index"));

const DEBOUNCE_TIME = 500;

interface PageEditorProps {
    id: string;
    address: Address;
    profile: Profile;
    dispatch?: AppDispatch;
    siteInfo: SiteInfo;
    typefaces: Typeface[];
    redirectTo?: string;
    state: AppState;
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
    dispatch,
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
    const [draftTypefaces, setDraftTypefaces] = useState([]);
    const [leftPaneContent, setLeftPaneContent] =
        useState<LeftPaneContent>("none");
    const [primaryFontFamily, setPrimaryFontFamily] =
        useState("Roboto, sans-serif");
    const [loading, setLoading] = useState(false);
    const [draftTheme, setDraftTheme] = useState<Theme>();
    const [theme, setTheme] = useState<Theme>();
    const { toast } = useToast();

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

    useEffect(() => {
        loadDraftTypefaces();
        loadPage();
    }, []);

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
                draftTheme {
                    name
                    colors
                    typography
                    interactives
                    structure
                }
                theme {
                    name
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
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            dispatch && dispatch(networkAction(true));
            const response = await fetch.exec();
            if (response.site.draftTypefaces) {
                setDraftTypefaces(response.site.draftTypefaces);
            }
            if (response.site.draftTheme) {
                setDraftTheme(response.site.draftTheme);
            }
            if (response.site.theme) {
                setTheme(response.site.theme);
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            dispatch && dispatch(networkAction(false));
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
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({ query, variables })
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            dispatch && dispatch(networkAction(true));
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
            dispatch && dispatch(networkAction(false));
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
        const widgetIndex = layout.findIndex(
            (widget) => widget.widgetId === widgetId,
        );
        layout.splice(widgetIndex, 1);
        setLayout(layout);
        await savePage({ pageId: page.pageId!, layout });
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
        setSelectedWidget();
        setLeftPaneContent("none");
    };

    const editWidget = useMemo(
        () => (
            <EditWidget
                widget={
                    page &&
                    layout?.filter((x) => x.widgetId === selectedWidget)[0]
                }
                pageData={page.pageData || {}}
                onChange={onWidgetSettingsChanged}
                onClose={onClose}
                onDelete={deleteWidget}
                state={state as AppState}
                dispatch={dispatch || (() => {})}
                key={selectedWidget}
            />
        ),
        [selectedWidget],
    );

    const saveDraftTypefaces = async (fontName: string) => {
        const newTypefaces: Typeface[] = structuredClone(draftTypefaces);
        const defaultSection = newTypefaces.filter(
            (x) => x.section === "default",
        )[0];
        defaultSection.typeface = fontName;

        const query = `
            mutation {
                site: updateDraftTypefaces(
                    typefaces: ${getGraphQLQueryStringFromObject(newTypefaces)} 
                ) {
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
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            dispatch && dispatch(networkAction(true));
            const response = await fetch.exec();
            if (response.site) {
                setDraftTypefaces(response.site.draftTypefaces);
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            dispatch && dispatch(networkAction(false));
        }
    };

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

    const saveTheme = async (theme: Theme) => {};

    const activeSidePaneContent = (
        <>
            {leftPaneContent === "widgets" && (
                <AddWidget
                    pageType={page.type?.toLowerCase()}
                    onSelection={addWidget}
                    onClose={(e) => setLeftPaneContent("none")}
                />
            )}
            {leftPaneContent === "editor" && editWidget}
            {leftPaneContent === "fonts" && (
                <FontsList
                    draftTypefaces={draftTypefaces}
                    onClose={onClose}
                    saveDraftTypefaces={saveDraftTypefaces}
                />
            )}
            {leftPaneContent === "theme" && (
                <ThemeEditor
                    draftTheme={draftTheme}
                    onClose={onClose}
                    onSave={({
                        name,
                        colors,
                        typography,
                        interactives,
                        structure,
                    }) =>
                        saveTheme({
                            name,
                            colors,
                            typography,
                            interactives,
                            structure,
                        })
                    }
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
                    socialImage={page.draftSocialImage || {}}
                    onClose={(e) => setLeftPaneContent("none")}
                    onSave={({
                        title,
                        description,
                        socialImage,
                        robotsAllowed,
                    }: {
                        title: string;
                        description: string;
                        socialImage: Media | {};
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
                            <Badge
                                variant="outline"
                                className="text-sm font-medium"
                            >
                                {page.type}
                            </Badge>
                            <h1 className="text-lg font-semibold">
                                {page.name}
                            </h1>
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
                                >
                                    <ArrowUpFromLine className="h-4 w-4" />
                                    {EDIT_PAGE_BUTTON_UPDATE}
                                </Button2>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button2
                                                component="link"
                                                variant="outline"
                                                size="icon"
                                                href={`/p/${page.pageId}`}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button2>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{EDIT_PAGE_BUTTON_VIEW}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button2
                                                variant="outline"
                                                size="icon"
                                                component="link"
                                                href={
                                                    redirectTo ||
                                                    (page.type === "product"
                                                        ? `/dashboard/product/${page.entityId}`
                                                        : `/dashboard/products`)
                                                }
                                            >
                                                <LogOut className="h-4 w-4" />
                                            </Button2>
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
                    {leftPaneContent !== "none" && (
                        <div className="w-[300px] rounded-xl border bg-background/98 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm">
                            <ScrollArea className="h-full">
                                <div>
                                    <div className="space-y-4">
                                        {activeSidePaneContent}
                                    </div>
                                </div>
                            </ScrollArea>
                        </div>
                    )}
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
                                {draftTypefaces.length > 0 && (
                                    <Template
                                        layout={layout}
                                        pageData={page.pageData || {}}
                                        editing={true}
                                        onEditClick={onWidgetClicked}
                                        selectedWidget={selectedWidget}
                                        onAddWidgetBelow={onAddWidgetBelow}
                                        onMoveWidgetDown={onMoveWidgetDown}
                                        onMoveWidgetUp={onMoveWidgetUp}
                                        state={state}
                                        dispatch={dispatch}
                                    />
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
                <style jsx global>{`
                    :root {
                        --primary-font: ${primaryFontFamily}, sans-serif;
                        --secondary-font: ${primaryFontFamily}, sans-serif;
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 p-4">
            <Skeleton className="w-full h-16" />
            <div className="flex gap-4">
                <Skeleton className="w-1/4 h-90" />
                <Skeleton className="w-3/4 h-screen" />
            </div>
        </div>
    );
}
