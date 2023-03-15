import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    AppMessage,
    Page,
    SiteInfo,
    WidgetInstance,
} from "@courselit/common-models";
import type { Address, Auth, Profile } from "@courselit/common-models";
import type { AppDispatch, AppState } from "@courselit/state-management";
import {
    networkAction,
    setAppMessage,
} from "@courselit/state-management/dist/action-creators";
import { debounce, FetchBuilder, generateUniqueId } from "@courselit/utils";
import { AppBar, Button, Grid, Toolbar, Typography } from "@mui/material";
import { connect } from "react-redux";
import {
    EDIT_PAGE_BUTTON_DONE,
    EDIT_PAGE_BUTTON_UPDATE,
    PAGE_TITLE_EDIT_PAGE,
} from "../../../ui-config/strings";
import { useRouter } from "next/router";
import { canAccessDashboard } from "../../../ui-lib/utils";
import Template from "../../public/base-layout/template";
import dynamic from "next/dynamic";
import Head from "next/head";
import Link from "next/link";
import { Menu } from "@courselit/components-library";
import widgets from "../../../ui-config/widgets";

const EditWidget = dynamic(() => import("./edit-widget"));
const AddWidget = dynamic(() => import("./add-widget"));
const WidgetsList = dynamic(() => import("./widgets-list"));

const DEBOUNCE_TIME = 500;

interface PageEditorProps {
    id: string;
    address: Address;
    auth: Auth;
    profile: Profile;
    dispatch: AppDispatch;
    loading: boolean;
    siteInfo: SiteInfo;
}

function PageEditor({
    id,
    address,
    auth,
    profile,
    dispatch,
    loading,
    siteInfo,
}: PageEditorProps) {
    const [pages, setPages] = useState([]);
    const [page, setPage] = useState<Partial<Page>>({});
    const [layout, setLayout] = useState<Partial<WidgetInstance>[]>([]);
    const [selectedWidget, setSelectedWidget] = useState<string>("");
    const [showWidgetSelector, setShowWidgetSelector] =
        useState<boolean>(false);
    const router = useRouter();
    const debouncedSave = useCallback(
        debounce(
            async (pageId: string, layout: Record<string, unknown>[]) =>
                await savePage(pageId, layout),
            DEBOUNCE_TIME
        ),
        []
    );

    useEffect(() => {
        loadPages();
        loadPage();
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
                    draftLayout
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
                draftLayout
            }
        }
        `;
        await fetchPage(query, true);
    };

    const onWidgetClicked = (widgetId: string) => {
        setSelectedWidget(widgetId);
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
                        JSON.parse(JSON.stringify(pageBeingEdited.draftLayout))
                    );
                }
                setPage(pageBeingEdited);
            } else {
                dispatch(
                    setAppMessage(new AppMessage(`The page does not exist.`))
                );
                router.replace(`/dashboard/products`);
            }
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    const savePage = async (
        pageId: string,
        layout: Record<string, unknown>[]
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
                    draftLayout
                }
            }
        `;
        await fetchPage(mutation);
    };

    const onWidgetSettingsChanged = (
        widgetId: string,
        settings: Record<string, unknown>
    ) => {
        const widgetIndex = layout.findIndex(
            (widget) => widget.widgetId === widgetId
        );
        layout[widgetIndex].settings = Object.assign(
            {},
            layout[widgetIndex].settings,
            settings
        );
        setLayout([...layout]);
    };

    const onDelete = async (widgetId: string) => {
        const widgetIndex = layout.findIndex(
            (widget) => widget.widgetId === widgetId
        );
        layout.splice(widgetIndex, 1);
        setLayout(layout);
        await savePage(page.pageId!, layout);
    };

    const addWidget = async (name: string) => {
        const widgetId = generateUniqueId();
        layout.splice(layout.length - 1, 0, {
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
        setShowWidgetSelector(false);
        onItemClick(widgetId);
        await savePage(page.pageId!, [...layout]);
    };

    const onClose = () => {
        setSelectedWidget("");
    };

    const editWidget = useMemo(
        () => (
            <EditWidget
                widget={
                    page &&
                    layout.filter((x) => x.widgetId === selectedWidget)[0]
                }
                onChange={onWidgetSettingsChanged}
                onClose={onClose}
                onDelete={onDelete}
            />
        ),
        [selectedWidget]
    );

    return (
        <Grid container direction="column">
            <Head>
                <title>
                    {PAGE_TITLE_EDIT_PAGE} {page.name} | {siteInfo.title}
                </title>
            </Head>
            <AppBar position="sticky">
                <Toolbar>
                    <Menu
                        options={pages.map((page: Record<string, unknown>) => ({
                            label: page.name,
                            type: "link",
                            href: `/dashboard/page/${page.pageId}/edit`,
                        }))}
                        label={page.name}
                        buttonColor="#fff"
                    />
                    <Grid item sx={{ flexGrow: 1 }}>
                        <Grid
                            container
                            alignItems="center"
                            justifyContent="flex-end"
                        >
                            <Grid item>
                                <Typography variant="body2">
                                    {loading ? "Saving" : "Saved"}
                                </Typography>
                            </Grid>
                            <Grid item>
                                <Link
                                    href={
                                        page.type === "PRODUCT"
                                            ? `/dashboard/product/${page.entityId}/content`
                                            : "/dashboard/products"
                                    }
                                >
                                    <Button
                                        component="a"
                                        sx={{ color: "white" }}
                                    >
                                        {EDIT_PAGE_BUTTON_DONE}
                                    </Button>
                                </Link>
                            </Grid>
                            <Grid>
                                <Button
                                    onClick={onPublish}
                                    sx={{ color: "white" }}
                                >
                                    {EDIT_PAGE_BUTTON_UPDATE}
                                </Button>
                            </Grid>
                        </Grid>
                    </Grid>
                </Toolbar>
            </AppBar>
            <Grid item>
                <Grid container>
                    <Grid
                        item
                        xs={3}
                        sx={{
                            borderRight: "1px solid #eee",
                            overflow: "scroll",
                            height: "100vh",
                        }}
                    >
                        {selectedWidget && editWidget}
                        {!selectedWidget && !showWidgetSelector && (
                            <WidgetsList
                                layout={layout}
                                onAddNewClick={() =>
                                    setShowWidgetSelector(true)
                                }
                                onItemClick={onItemClick}
                            />
                        )}
                        {!selectedWidget && showWidgetSelector && (
                            <AddWidget
                                pageType={page.type?.toLowerCase()}
                                onSelection={addWidget}
                                onClose={(e) => setShowWidgetSelector(false)}
                            />
                        )}
                    </Grid>
                    <Grid
                        item
                        xs={9}
                        sx={{
                            flexGrow: 1,
                            overflow: "scroll",
                            height: "100vh",
                        }}
                    >
                        <Template
                            layout={layout}
                            editing={true}
                            onEditClick={onWidgetClicked}
                            selectedWidget={selectedWidget}
                        />
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    );
}

const mapStateToProps = (state: AppState) => ({
    auth: state.auth,
    profile: state.profile,
    address: state.address,
    loading: state.networkAction,
    siteInfo: state.siteinfo,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(PageEditor);
