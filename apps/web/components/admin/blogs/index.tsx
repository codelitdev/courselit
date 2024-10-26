import React, { useCallback, useEffect, useState } from "react";
import {
    Address,
    AppMessage,
    Course,
    SiteInfo,
} from "@courselit/common-models";
import { AppDispatch, AppState } from "@courselit/state-management";
import {
    networkAction,
    setAppMessage,
} from "@courselit/state-management/dist/action-creators";
import { FetchBuilder } from "@courselit/utils";
import { connect } from "react-redux";
import {
    BLOG_TABLE_HEADER_NAME,
    BTN_NEW_BLOG,
    MANAGE_BLOG_PAGE_HEADING,
    PRODUCTS_TABLE_HEADER_ACTIONS,
    PRODUCTS_TABLE_HEADER_STATUS,
    PRODUCT_TABLE_CONTEXT_MENU_EDIT_PAGE,
} from "../../../ui-config/strings";
import dynamic from "next/dynamic";
import { MoreVert } from "@courselit/icons";
import { MenuItem, Menu2, Button, Link } from "@courselit/components-library";
import { Table } from "@courselit/components-library";
import { TableHead } from "@courselit/components-library";
import { TableBody } from "@courselit/components-library";
import { usePathname } from "next/navigation";

const BlogItem = dynamic(() => import("./blog-item"));

interface IndexProps {
    dispatch?: AppDispatch;
    address: Address;
    loading: boolean;
    siteinfo: SiteInfo;
    prefix: string;
}

export const Index = ({
    loading,
    dispatch,
    address,
    siteinfo,
    prefix,
}: IndexProps) => {
    const [coursesPaginationOffset, setCoursesPaginationOffset] = useState(1);
    const [creatorCourses, setCreatorCourses] = useState<
        (Course & { published: boolean })[]
    >([]);
    const [endReached, setEndReached] = useState(false);
    const path = usePathname();

    const loadBlogs = useCallback(async () => {
        const query = `
    query {
      courses: getCoursesAsAdmin(
        offset: ${coursesPaginationOffset},
        filterBy: BLOG
      ) {
        id,
        title,
        featuredImage {
          thumbnail
        },
        courseId,
        published,
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
            setEndReached(false);
            const response = await fetch.exec();
            if (response.courses) {
                setCreatorCourses([...response.courses]);
                if (response.courses.length === 0) {
                    setEndReached(true);
                }
            }
        } catch (err: any) {
            dispatch && dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch && dispatch(networkAction(false));
        }
    }, [address.backend, coursesPaginationOffset, dispatch]);

    useEffect(() => {
        loadBlogs();
    }, []);

    useEffect(() => {
        loadBlogs();
    }, [coursesPaginationOffset, loadBlogs]);

    const onDelete = (index: number) => {
        creatorCourses.splice(index, 1);
        setCreatorCourses([...creatorCourses]);
    };

    return (
        <div className="flex flex-col">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-semibold mb-4">
                    {MANAGE_BLOG_PAGE_HEADING}
                </h1>
                <div className="flex items-center gap-4">
                    <Link href={`${prefix}/blog/new`}>
                        <Button>{BTN_NEW_BLOG}</Button>
                    </Link>
                    <Menu2 icon={<MoreVert />} variant="soft">
                        <MenuItem>
                            <Link
                                href={`/dashboard/page/blog/edit?redirectTo=${prefix}/blogs`}
                                className="flex w-full"
                            >
                                {PRODUCT_TABLE_CONTEXT_MENU_EDIT_PAGE}
                            </Link>
                        </MenuItem>
                    </Menu2>
                </div>
            </div>
            <Table aria-label="Products">
                <TableHead className="border-0 border-b border-slate-200">
                    <td>{BLOG_TABLE_HEADER_NAME}</td>
                    <td align="right">{PRODUCTS_TABLE_HEADER_STATUS}</td>
                    <td align="right">{PRODUCTS_TABLE_HEADER_ACTIONS}</td>
                </TableHead>
                <TableBody
                    loading={loading}
                    endReached={endReached}
                    page={coursesPaginationOffset}
                    onPageChange={(value: number) => {
                        setCoursesPaginationOffset(value);
                    }}
                >
                    {creatorCourses.map(
                        (
                            product: Course & {
                                published: boolean;
                            },
                            index: number,
                        ) => (
                            <BlogItem
                                key={product.courseId}
                                details={product}
                                position={index}
                                onDelete={onDelete}
                                siteinfo={siteinfo}
                                address={address}
                                prefix={prefix}
                            />
                        ),
                    )}
                </TableBody>
            </Table>
            {/* {creatorCourses.length > 0 && (
                <div className="flex justify-center">
                    <Button
                        variant="soft"
                        onClick={() =>
                            setCoursesPaginationOffset(
                                coursesPaginationOffset + 1,
                            )
                        }
                    >
                        {LOAD_MORE_TEXT}
                    </Button>
                </div>
            )} */}
        </div>
    );
};

const mapStateToProps = (state: AppState) => ({
    profile: state.profile,
    address: state.address,
    loading: state.networkAction,
    siteinfo: state.siteinfo,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(Index);
