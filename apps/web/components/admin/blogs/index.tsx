import React, { useEffect, useState } from "react";
import {
    Address,
    AppMessage,
    Auth,
    Course,
    Profile,
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
    LOAD_MORE_TEXT,
    MANAGE_BLOG_PAGE_HEADING,
    PRODUCTS_TABLE_HEADER_ACTIONS,
    PRODUCTS_TABLE_HEADER_STATUS,
    PRODUCT_TABLE_CONTEXT_MENU_EDIT_PAGE,
} from "../../../ui-config/strings";
import dynamic from "next/dynamic";
import { MoreVert } from "@courselit/icons";
import {
    MenuItem,
    Menu2,
    Button,
    Link
} from "@courselit/components-library";

const BlogItem = dynamic(() => import("./blog-item"));

interface IndexProps {
    auth: Auth;
    profile: Profile;
    dispatch: AppDispatch;
    address: Address;
}

const Index = (props: IndexProps) => {
    const [coursesPaginationOffset, setCoursesPaginationOffset] = useState(1);
    const [creatorCourses, setCreatorCourses] = useState<
        (Course & { published: boolean })[]
    >([]);

    useEffect(() => {
        loadBlogs();
    }, []);

    const loadBlogs = async () => {
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
            .setUrl(`${props.address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            props.dispatch(networkAction(true));
            const response = await fetch.exec();
            if (response.courses && response.courses.length > 0) {
                setCreatorCourses([...creatorCourses, ...response.courses]);
                setCoursesPaginationOffset(coursesPaginationOffset + 1);
            }
        } catch (err: any) {
            props.dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            props.dispatch(networkAction(false));
        }
    };

    const onDelete = (index: number) => {
        creatorCourses.splice(index, 1);
        setCreatorCourses([...creatorCourses]);
    };

    return (
        <div className="flex flex-col">
                <div className="flex justify-between items-center mb-8"
                >
                <h1 className="text-4xl font-semibold mb-4">
                            {MANAGE_BLOG_PAGE_HEADING}
                </h1>
                        <div
                            className="flex items-center gap-4">
                                <Link href="/dashboard/blog/new">
                                    <Button>
                                        {BTN_NEW_BLOG}
                                    </Button>
                                </Link>
                                <Menu2 icon={<MoreVert />} variant="soft">
                                    <MenuItem>
                                        <Link
                                            href={`/dashboard/page/blog/edit`}
                                        >
                                            {
                                                PRODUCT_TABLE_CONTEXT_MENU_EDIT_PAGE
                                            }
                                        </Link>
                                    </MenuItem>
                                </Menu2>
                        </div>
                </div>
                    <table aria-label="Products">
                        <thead className="border-0 border-b border-slate-200">
                            <tr className="font-medium">
                                <td>{BLOG_TABLE_HEADER_NAME}</td>
                                <td align="right">
                                    {PRODUCTS_TABLE_HEADER_STATUS}
                                </td>
                                <td align="right">
                                    {PRODUCTS_TABLE_HEADER_ACTIONS}
                                </td>
                            </tr>
                        </thead>
                        <tbody>
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
                                    />
                                ),
                            )}
                        </tbody>
                    </table>
            {creatorCourses.length > 0 && (
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
            )}
        </div>
    );
};

const mapStateToProps = (state: AppState) => ({
    auth: state.auth,
    profile: state.profile,
    address: state.address,
    loading: state.networkAction,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(Index);
