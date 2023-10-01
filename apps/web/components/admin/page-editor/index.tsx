import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    AppMessage,
    Page,
    SiteInfo,
    Theme,
    Typeface,
    WidgetInstance,
} from "@courselit/common-models";
import type { Address, Auth, Profile } from "@courselit/common-models";
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
import { connect } from "react-redux";
import {
    EDIT_PAGE_BUTTON_DONE,
    EDIT_PAGE_BUTTON_UPDATE,
    PAGE_TITLE_EDIT_PAGE,
    EDIT_PAGE_BUTTON_FONTS,
} from "../../../ui-config/strings";
import { useRouter } from "next/router";
import {
    canAccessDashboard,
    generateFontString,
    moveMemberUp,
    moveMemberDown,
} from "../../../ui-lib/utils";
import Template from "../../public/base-layout/template";
import dynamic from "next/dynamic";
import Head from "next/head";
import widgets from "../../../ui-config/widgets";
import PagesList from "./pages-list";
import { Sync, CheckCircled } from "@courselit/icons";
import AppToast from "../../app-toast";
import { Button, CircularProgress } from "@courselit/components-library";

const EditWidget = dynamic(() => import("./edit-widget"));
const AddWidget = dynamic(() => import("./add-widget"));
const FontsList = dynamic(() => import("./fonts-list"));

const DEBOUNCE_TIME = 500;

interface PageEditorProps {
    id: string;
    address: Address;
    auth: Auth;
    profile: Profile;
    dispatch: AppDispatch;
    loading: boolean;
    siteInfo: SiteInfo;
    theme: Theme;
    typefaces: Typeface[];
    redirectTo?: string;
}

type LeftPaneContent =
    | "fonts"
    | "pages"
    | "themes"
    | "editor"
    | "widgets"
    | "none";

function PageEditor({
    id,
    address,
    auth,
    profile,
    dispatch,
    loading,
    theme,
    redirectTo,
}: PageEditorProps) {
    const [pages, setPages] = useState([]);
    const [page, setPage] = useState<Partial<Page>>({});
    const [layout, setLayout] = useState<Partial<WidgetInstance>[]>([]);
    const [selectedWidget, setSelectedWidget] = useState<string>();
    const [selectedWidgetIndex, setSelectedWidgetIndex] = useState<number>(-1);
    const [draftTypefaces, setDraftTypefaces] = useState([]);
    const [leftPaneContent, setLeftPaneContent] =
        useState<LeftPaneContent>("none");
    const [primaryFontFamily, setPrimaryFontFamily] =
        useState("Roboto, sans-serif");

    const router = useRouter();
    const debouncedSave = useCallback(
        debounce(
            async (pageId: string, layout: Record<string, unknown>[]) =>
                await savePage(pageId, layout),
            DEBOUNCE_TIME,
        ),
        [],
    );

    const fontString = generateFontString(draftTypefaces);

    useEffect(() => {
        loadDraftTypefaces();
        loadPage();
        loadPages();
    }, []);

    useEffect(() => {
        if (profile.fetched && !canAccessDashboard(profile)) {
            router.push("/");
        }
    }, [profile.fetched]);

    useEffect(() => {
        if (auth.checked && auth.guest) {
            router.push(`/login?redirect=${router.asPath}`);
        }
    }, [auth.checked]);

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
                page: savePage(pageData: {
                    pageId: "${id}",
                    publish: true
                }) {
                    pageId,
                    name,
                    type,
                    layout,
                    draftLayout,
                    pageData
                }
            }
        `;
        await fetchPage(mutation);
    };

    const loadPages = async () => {
        const query = `
        query {
            pages: getPages {
                pageId,
                name,
                entityId
            }
        }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            dispatch(networkAction(true));
            const response = await fetch.exec();
            if (response.pages) {
                setPages(response.pages);
            }
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
            router.replace(`/dashboard`);
        } finally {
            dispatch(networkAction(false));
        }
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
                pageData
            }
        }
        `;
        await fetchPage(query, true);
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
            dispatch(networkAction(true));
            const response = await fetch.exec();
            if (response.site.draftTypefaces) {
                setDraftTypefaces(response.site.draftTypefaces);
            }
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    const onWidgetClicked = (widgetId: string) => {
        setSelectedWidget(widgetId);
        setLeftPaneContent("editor");
    };

    const fetchPage = async (query: string, refreshLayout: boolean = false) => {
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            dispatch(networkAction(true));
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
                dispatch(
                    setAppMessage(new AppMessage(`The page does not exist.`)),
                );
                router.replace(`/dashboard`);
            }
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    const savePage = async (
        pageId: string,
        layout: Record<string, unknown>[],
    ) => {
        if (!pageId || !layout || !layout.length) return;

        const mutation = `
            mutation {
                page: savePage(pageData: {
                    pageId: "${pageId}",
                    layout: ${JSON.stringify(JSON.stringify(layout))}
                }) {
                    pageId,
                    name,
                    type,
                    entityId,
                    layout,
                    draftLayout,
                    pageData
                }
            }
        `;
        await fetchPage(mutation);
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
        await savePage(page.pageId!, layout);
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
        await savePage(page.pageId!, [...layout]);
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
            dispatch(networkAction(true));
            const response = await fetch.exec();
            if (response.site) {
                setDraftTypefaces(response.site.draftTypefaces);
            }
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
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
            {leftPaneContent === "pages" && (
                <PagesList pages={pages} onClose={onClose} />
            )}
        </>
    );

    return (
        <div className="flex flex-col">
            <Head>
                <title>{`${PAGE_TITLE_EDIT_PAGE} ${page.name || ""}`}</title>
                {fontString && <link rel="stylesheet" href={fontString} />}
            </Head>
            <div className="fixed w-full border-0 border-b border-slate-200 z-10">
                <header className="flex w-full p-4 justify-between bg-white/80 backdrop-blur-md">
                    <div className="flex gap-2">
                        <Button
                            onClick={() => {
                                setLeftPaneContent("pages");
                            }}
                            variant="soft"
                        >
                            {page.name}
                        </Button>
                        <Button
                            onClick={() => {
                                setLeftPaneContent("fonts");
                            }}
                            variant="soft"
                        >
                            {EDIT_PAGE_BUTTON_FONTS}
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
                                    ? `/dashboard/product/${page.entityId}/content`
                                    : "/dashboard/products")
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
                    {draftTypefaces.length === 0 && <CircularProgress />}
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
                        />
                    )}
                    <style jsx global>{`
                        :root {
                            --primary-font: ${primaryFontFamily}, sans-serif;
                            --secondary-font: ${primaryFontFamily}, sans-serif;
                        }
                    `}</style>
                </div>
            </div>
            <AppToast />
        </div>
    );
}

const mapStateToProps = (state: AppState) => ({
    auth: state.auth,
    profile: state.profile,
    address: state.address,
    loading: state.networkAction,
    siteInfo: state.siteinfo,
    theme: state.theme,
    typefaces: state.typefaces,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(PageEditor);
