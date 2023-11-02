import {
    Breadcrumbs,
    Button,
    Link,
    Menu2,
    MenuItem,
    Table,
    TableBody,
    TableHead,
    TableRow,
} from "@courselit/components-library";
import { AppDispatch, AppState } from "@courselit/state-management";
import {
    BTN_NEW_TAG,
    DELETE_TAG_POPUP_HEADER,
    PRODUCTS_TABLE_HEADER_ACTIONS,
    TAGS_TABLE_CONTEXT_MENU_DELETE_PRODUCT,
    TAGS_TABLE_CONTEXT_MENU_UNTAG,
    TAG_TABLE_HEADER_NAME,
    TAG_TABLE_HEADER_SUBS_COUNT,
    UNTAG_POPUP_DESC,
    UNTAG_POPUP_HEADER,
    USERS_MANAGER_PAGE_HEADING,
    USERS_TAG_HEADER,
} from "@ui-config/strings";
import { useCallback } from "react";
import { useEffect } from "react";
import { connect } from "react-redux";
import { actionCreators } from "@courselit/state-management";
import { FetchBuilder } from "@courselit/utils";
import { Address, AppMessage } from "@courselit/common-models";
import { useState } from "react";
import { MoreVert } from "@courselit/icons";
const { networkAction, setAppMessage } = actionCreators;

interface TagsProps {
    address: Address;
    dispatch: AppDispatch;
}

interface TagWithDetails {
    tag: string;
    count: number;
}

function Tags({ address, dispatch }: TagsProps) {
    const [tags, setTags] = useState<TagWithDetails[]>([]);
    const [loading, setLoading] = useState(false);

    const getTags = useCallback(async () => {
        const query = `
            query {
                tags: tagsWithDetails {
                    tag,
                    count
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            setLoading(true);
            dispatch(networkAction(true));
            const response = await fetch.exec();
            if (response.tags) {
                setTags(response.tags);
            }
        } catch (err) {
        } finally {
            setLoading(false);
            dispatch(networkAction(false));
        }
    }, [address.backend, dispatch]);

    useEffect(() => {
        getTags();
    }, [getTags]);

    const deleteTag = async (tag: string) => {
        const mutation = `
            mutation DeleteTag($name: String!) {
              tags: deleteTag(name: $name) {
                    tag,
                    count
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query: mutation,
                variables: {
                    name: tag,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            dispatch(networkAction(true));
            const response = await fetch.exec();
            if (response.tags) {
                setTags(response.tags);
            }
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    const untagUsers = async (tag: string) => {
        const mutation = `
            mutation UntagUsers($name: String!) {
              tags: untagUsers(name: $name) {
                    tag,
                    count
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query: mutation,
                variables: {
                    name: tag,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            dispatch(networkAction(true));
            const response = await fetch.exec();
            if (response.tags) {
                setTags(response.tags);
            }
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    return (
        <div className="flex flex-col">
            <div className="mb-4">
                <Breadcrumbs aria-label="breakcrumb">
                    <Link href="/dashboard/users">
                        {USERS_MANAGER_PAGE_HEADING}
                    </Link>

                    <p>{USERS_TAG_HEADER}</p>
                </Breadcrumbs>
            </div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-semibold mb-4">
                    {USERS_TAG_HEADER}
                </h1>
                <div>
                    <Button>{BTN_NEW_TAG}</Button>
                </div>
            </div>
            <Table aria-label="Tags">
                <TableHead>
                    <td>{TAG_TABLE_HEADER_NAME}</td>
                    <td align="right">{TAG_TABLE_HEADER_SUBS_COUNT}</td>
                    <td align="right">{PRODUCTS_TABLE_HEADER_ACTIONS}</td>
                </TableHead>
                <TableBody loading={loading}>
                    {tags.map((tag) => (
                        <TableRow key={tag.tag}>
                            <td className="py-2">{tag.tag}</td>
                            <td align="right">{tag.count}</td>
                            <td align="right">
                                <Menu2 icon={<MoreVert />} variant="soft">
                                    <MenuItem
                                        component="dialog"
                                        title={`${UNTAG_POPUP_HEADER} "${tag.tag}"`}
                                        triggerChildren={
                                            TAGS_TABLE_CONTEXT_MENU_UNTAG
                                        }
                                        description={UNTAG_POPUP_DESC}
                                        onClick={() => untagUsers(tag.tag)}
                                    ></MenuItem>
                                    <MenuItem
                                        component="dialog"
                                        title={
                                            TAGS_TABLE_CONTEXT_MENU_DELETE_PRODUCT
                                        }
                                        triggerChildren={
                                            DELETE_TAG_POPUP_HEADER
                                        }
                                        onClick={() => deleteTag(tag.tag)}
                                    ></MenuItem>
                                </Menu2>
                            </td>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
const mapStateToProps = (state: AppState) => ({
    address: state.address,
    profile: state.profile,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(Tags);
