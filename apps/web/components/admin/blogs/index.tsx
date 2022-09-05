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
import {
    Button,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import Link from "next/link";
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
import { Menu } from "@courselit/components-library";
import { MoreVert } from "@mui/icons-material";

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
        <Grid container direction="column">
            <Grid item sx={{ mb: 2 }}>
                <Grid
                    container
                    justifyContent="space-between"
                    alignItems="center"
                >
                    <Grid item>
                        <Typography variant="h1">
                            {MANAGE_BLOG_PAGE_HEADING}
                        </Typography>
                    </Grid>
                    <Grid item>
                        <Grid container alignItems="center">
                            <Grid item sx={{ mr: 1 }}>
                                <Link href="/dashboard/blog/new">
                                    <Button variant="contained" component="a">
                                        {BTN_NEW_BLOG}
                                    </Button>
                                </Link>
                            </Grid>
                            <Grid item>
                                <Menu
                                    options={[
                                        {
                                            label: PRODUCT_TABLE_CONTEXT_MENU_EDIT_PAGE,
                                            type: "link",
                                            href: `/dashboard/page/blog/edit`,
                                        },
                                    ]}
                                    icon={<MoreVert />}
                                />
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
            <Grid item sx={{ mb: 2 }}>
                <TableContainer>
                    <Table aria-label="Products">
                        <TableHead>
                            <TableRow>
                                <TableCell>{BLOG_TABLE_HEADER_NAME}</TableCell>
                                <TableCell align="right">
                                    {PRODUCTS_TABLE_HEADER_STATUS}
                                </TableCell>
                                <TableCell align="right">
                                    {PRODUCTS_TABLE_HEADER_ACTIONS}
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {creatorCourses.map(
                                (
                                    product: Course & {
                                        published: boolean;
                                    },
                                    index: number
                                ) => (
                                    <BlogItem
                                        key={product.courseId}
                                        details={product}
                                        position={index}
                                        onDelete={onDelete}
                                    />
                                )
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Grid>
            {creatorCourses.length > 0 && (
                <Grid item container justifyContent="center" sx={{ mb: 2 }}>
                    <Grid item>
                        <Button
                            variant="outlined"
                            onClick={() =>
                                setCoursesPaginationOffset(
                                    coursesPaginationOffset + 1
                                )
                            }
                        >
                            {LOAD_MORE_TEXT}
                        </Button>
                    </Grid>
                </Grid>
            )}
        </Grid>
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
