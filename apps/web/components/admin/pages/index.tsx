import { Address, AppMessage, Page } from "@courselit/common-models";
import { Menu2, MenuItem, TableBody } from "@courselit/components-library";
import { TableRow } from "@courselit/components-library";
import { TableHead } from "@courselit/components-library";
import { Table } from "@courselit/components-library";
import { Button, Link } from "@courselit/components-library";
import { View } from "@courselit/icons";
import { Edit, MoreVert } from "@courselit/icons";
import { AppDispatch, AppState } from "@courselit/state-management";
import {
    networkAction,
    setAppMessage,
} from "@courselit/state-management/dist/action-creators";
import { FetchBuilder } from "@courselit/utils";
import {
    APP_MESSAGE_PAGE_DELETED,
    BTN_NEW_PAGE,
    DELETE_PAGE_POPUP_HEADER,
    DELETE_PAGE_POPUP_TEXT,
    MANAGE_PAGES_PAGE_HEADING,
    PAGES_TABLE_HEADER_ACTIONS,
    PAGES_TABLE_HEADER_NAME,
    PAGE_TABLE_CONTEXT_MENU_DELETE,
    PAGE_TITLE_EDIT_PAGE,
    PAGE_TITLE_VIEW_PAGE,
} from "@ui-config/strings";
import { useEffect, useState } from "react";
import { connect } from "react-redux";

interface IndexProps {
    dispatch: AppDispatch;
    address: Address;
    loading: boolean;
    prefix: string;
}

export const Pages = ({ loading, address, dispatch, prefix }: IndexProps) => {
    const [pages, setPages] = useState<Page[]>([]);

    useEffect(() => {
        loadPages();
    }, []);

    const loadPages = async () => {
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

    const deletePage = async (page: Page) => {
        const query = `
        mutation {
        result: deletePage(id: "${page.pageId}")
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

            if (response.result) {
                const deletedPageIndex = pages.indexOf(page);
                pages.splice(deletedPageIndex, 1);
                setPages([...pages]);
            }

            dispatch(setAppMessage(new AppMessage(APP_MESSAGE_PAGE_DELETED)));
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    return (
        <div className="flex flex-col">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-semibold mb-4">
                    {MANAGE_PAGES_PAGE_HEADING}
                </h1>
                <div>
                    <Link href={`${prefix}/page/new`}>
                        <Button>{BTN_NEW_PAGE}</Button>
                    </Link>
                </div>
            </div>
            <Table aria-label="Products">
                <TableHead>
                    <td>{PAGES_TABLE_HEADER_NAME}</td>
                    <td align="right">{PAGES_TABLE_HEADER_ACTIONS}</td>
                </TableHead>
                <TableBody>
                    {pages
                        .sort((a) => (a.deleteable ? 1 : -1))
                        .map((page) => (
                            <TableRow key={page.pageId}>
                                <td className="py-4">
                                    <p>{page.name}</p>
                                </td>
                                <td align="right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Link
                                            href={`${address.frontend}${
                                                page.pageId === "homepage"
                                                    ? ""
                                                    : `/p/${page.pageId}`
                                            }`}
                                            openInSameTab={false}
                                        >
                                            <Button variant="soft">
                                                <View />
                                                {PAGE_TITLE_VIEW_PAGE}
                                            </Button>
                                        </Link>
                                        <Link
                                            href={`${prefix}/page/${
                                                page.pageId
                                            }${
                                                prefix === "/dashboard"
                                                    ? "/edit"
                                                    : ""
                                            }?redirectTo=${prefix}/pages`}
                                        >
                                            <Button variant="soft">
                                                <Edit />
                                                {PAGE_TITLE_EDIT_PAGE}
                                            </Button>
                                        </Link>
                                        {page.deleteable && (
                                            <Menu2
                                                icon={<MoreVert />}
                                                variant="soft"
                                            >
                                                <MenuItem
                                                    component="dialog"
                                                    title={
                                                        DELETE_PAGE_POPUP_HEADER
                                                    }
                                                    triggerChildren={
                                                        PAGE_TABLE_CONTEXT_MENU_DELETE
                                                    }
                                                    description={
                                                        DELETE_PAGE_POPUP_TEXT
                                                    }
                                                    onClick={() =>
                                                        deletePage(page)
                                                    }
                                                ></MenuItem>
                                            </Menu2>
                                        )}
                                    </div>
                                </td>
                            </TableRow>
                        ))}
                </TableBody>
            </Table>
        </div>
    );
};

const mapStateToProps = (state: AppState) => ({
    address: state.address,
    loading: state.networkAction,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(Pages);
