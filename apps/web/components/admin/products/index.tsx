import React, { useEffect, useState } from "react";
import {
    Grid,
    Typography,
    TableContainer,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Button,
} from "@mui/material";
import { connect } from "react-redux";
import {
    MANAGE_COURSES_PAGE_HEADING,
    LOAD_MORE_TEXT,
    PRODUCTS_TABLE_HEADER_NAME,
    PRODUCTS_TABLE_HEADER_STATUS,
    PRODUCTS_TABLE_HEADER_STUDENTS,
    PRODUCTS_TABLE_HEADER_SALES,
    PRODUCTS_TABLE_HEADER_ACTIONS,
    BTN_NEW_PRODUCT,
} from "../../../ui-config/strings";
import { FetchBuilder } from "@courselit/utils";
import Link from "next/link";
import type { Auth, Profile, Address, Course } from "@courselit/common-models";
import { AppMessage } from "@courselit/common-models";
import type { AppDispatch, AppState } from "@courselit/state-management";
import { actionCreators } from "@courselit/state-management";
import Product from "./product";

const { networkAction, setAppMessage } = actionCreators;

interface IndexProps {
    auth: Auth;
    profile: Profile;
    dispatch: AppDispatch;
    address: Address;
}

const Index = (props: IndexProps) => {
    const [coursesPaginationOffset, setCoursesPaginationOffset] = useState(1);
    const [creatorCourses, setCreatorCourses] = useState([]);
    const [searchText, setSearchText] = useState("");
    const [searchState, setSearchState] = useState(0);

    useEffect(() => {
        loadCreatorCourses();
    }, []);

    useEffect(() => {
        loadCreatorCourses();
    }, [searchState]);

    const loadCreatorCourses = async () => {
        const query = searchText
            ? `
    query {
      courses: getCoursesAsAdmin(
        offset: ${coursesPaginationOffset},
        searchText: "${searchText}"
      ) {
        id,
        title,
        featuredImage {
          thumbnail
        },
        courseId,
        type,
        published,
        sales,
        customers,
        pageId
      }
    }
    `
            : `
    query {
      courses: getCoursesAsAdmin(
        offset: ${coursesPaginationOffset}
      ) {
        id,
        title,
        featuredImage {
          thumbnail
        },
        courseId,
        type,
        published,
        sales,
        customers,
        pageId
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

    const searchCourses = async (e) => {
        e.preventDefault();

        setCoursesPaginationOffset(1);
        setCreatorCourses([]);
        setSearchState(searchState + 1);
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
                            {MANAGE_COURSES_PAGE_HEADING}
                        </Typography>
                    </Grid>
                    <Grid item>
                        <Link href="/dashboard/product/new">
                            <Button variant="contained" component="a">
                                {BTN_NEW_PRODUCT}
                            </Button>
                        </Link>
                    </Grid>
                </Grid>
            </Grid>
            <Grid item sx={{ mb: 2 }}>
                <TableContainer>
                    <Table aria-label="Products">
                        <TableHead>
                            <TableRow>
                                <TableCell>
                                    {PRODUCTS_TABLE_HEADER_NAME}
                                </TableCell>
                                <TableCell align="right">
                                    {PRODUCTS_TABLE_HEADER_STATUS}
                                </TableCell>
                                <TableCell align="right">
                                    {PRODUCTS_TABLE_HEADER_STUDENTS}
                                </TableCell>
                                <TableCell align="right">
                                    {PRODUCTS_TABLE_HEADER_SALES}
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
                                        sales: number;
                                        customers: number;
                                    },
                                    index: number
                                ) => (
                                    <Product
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
