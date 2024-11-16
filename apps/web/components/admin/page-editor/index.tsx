import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    AppMessage,
    Page,
    SiteInfo,
    Typeface,
    WidgetInstance,
} from "@courselit/common-models";
import type { Address, Media, Profile } from "@courselit/common-models";
import type { AppDispatch, AppState } from "@courselit/state-management";
import {
    networkAction,
    setAppMessage,
} from "@courselit/state-management/dist/action-creators";
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
    EDIT_PAGE_BUTTON_FONTS,
    EDIT_PAGE_BUTTON_SEO,
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
import { Button, Skeleton } from "@courselit/components-library";
import SeoEditor from "./seo-editor";

const EditWidget = dynamic(() => import("./edit-widget"));
const AddWidget = dynamic(() => import("./add-widget"));
const FontsList = dynamic(() => import("./fonts-list"));

const DEBOUNCE_TIME = 500;

interface PageEditorProps {
    id: string;
    address: Address;
    profile: Profile;
    dispatch?: AppDispatch;
    siteInfo: SiteInfo;
    typefaces: Typeface[];
    redirectTo?: string;
    prefix: string;
    state: AppState;
}

type LeftPaneContent =
    | "fonts"
    | "themes"
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
    prefix,
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
        } catch (err: any) {
            dispatch && dispatch(setAppMessage(new AppMessage(err.message)));
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
                dispatch &&
                    dispatch(
                        setAppMessage(
                            new AppMessage(`The page does not exist.`),
                        ),
                    );
                router.replace(`${prefix}/pages`);
            }
        } catch (err: any) {
            dispatch && dispatch(setAppMessage(new AppMessage(err.message)));
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
            dispatch && dispatch(setAppMessage(new AppMessage(err.message)));
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
            <div className="flex flex-col">
                <Head>
                    <title>{`${PAGE_TITLE_EDIT_PAGE} ${
                        page.name || ""
                    }`}</title>
                    {fontString && <link rel="stylesheet" href={fontString} />}
                </Head>
                <div className="fixed w-full border-0 border-b border-slate-200 z-10">
                    <header className="flex w-full p-4 justify-between bg-white/80 backdrop-blur-md">
                        <div className="flex gap-2">
                            <Button
                                onClick={() => {
                                    setLeftPaneContent("fonts");
                                }}
                                variant="soft"
                            >
                                {EDIT_PAGE_BUTTON_FONTS}
                            </Button>
                            <Button
                                onClick={() => {
                                    setLeftPaneContent("seo");
                                }}
                                variant="soft"
                            >
                                {EDIT_PAGE_BUTTON_SEO}
                            </Button>
                        </div>
                        <div className="flex justify-end items-center gap-2">
                            {loading && <Sync />}
                            {!loading && <CheckCircled />}
                            <Button
                                variant="soft"
                                component="link"
                                href={
                                    redirectTo ||
                                    (page.type === "product"
                                        ? `${prefix}/product/${page.entityId}${
                                              prefix === "/dashboard"
                                                  ? "/content"
                                                  : ""
                                          }`
                                        : `${prefix}/products`)
                                }
                            >
                                {EDIT_PAGE_BUTTON_DONE}
                            </Button>
                            <Button onClick={onPublish} sx={{ color: "white" }}>
                                {EDIT_PAGE_BUTTON_UPDATE}
                            </Button>
                        </div>
                    </header>
                </div>
                <div className="flex h-screen pt-[64px] w-full">
                    {leftPaneContent !== "none" && (
                        <div className="overflow-y-auto w-[440px] max-h-screen border-0 border-r border-slate-200">
                            {activeSidePaneContent}
                        </div>
                    )}
                    <div className="w-full max-h-screen overflow-y-auto scroll-smooth">
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
                        <style jsx global>{`
                            :root {
                                --primary-font: ${primaryFontFamily}, sans-serif;
                                --secondary-font: ${primaryFontFamily},
                                    sans-serif;
                            }
                        `}</style>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <Skeleton className="w-full h-16" />
            <div className="flex gap-4 px-4">
                <Skeleton className="w-1/4 h-90" />
                <Skeleton className="w-3/4 h-screen" />
            </div>
        </div>
    );
}
