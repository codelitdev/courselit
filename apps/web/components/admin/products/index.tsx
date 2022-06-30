import React, { useEffect, useState } from "react";
import { styled } from "@mui/system";
import {
    Grid,
    Typography,
    ListItem,
    ListItemText,
    ListItemAvatar,
    TableContainer,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Link as MuiLink,
    Chip,
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
import { Section, Image } from "@courselit/components-library";
import { checkPermission } from "../../../ui-lib/utils";
import { Add, Search } from "@mui/icons-material";
import constants from "../../../config/constants";
const { permissions } = constants;
import Link from "next/link";
import type { Auth, Profile, Address, Course } from "@courselit/common-models";
import { AppMessage } from "@courselit/common-models";
import type { AppDispatch, AppState } from "@courselit/state-management";
import { actionCreators } from "@courselit/state-management";
import Product from "./product";

const { networkAction, setAppMessage } = actionCreators;

const PREFIX = "index";

const classes = {
    avatar: `${PREFIX}-avatar`,
    listItem: `${PREFIX}-listItem`,
    listItemText: `${PREFIX}-listItemText`,
};

const StyledGrid = styled(Grid)(({ theme }: { theme: any }) => ({
    [`& .${classes.avatar}`]: {
        height: "50px !important",
        [theme.breakpoints.up("md")]: {
            height: "100px !important",
        },
        width: "auto !important",
        background: "red",
    },

    [`& .${classes.listItem}`]: {
        cursor: "pointer",
    },

    [`& .${classes.listItemText}`]: {
        paddingLeft: theme.spacing(1),
    },
}));

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
        },,
        isBlog,
        courseId,
        type,
        published,
        sales,
        customers
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
        },,
        isBlog,
        courseId,
        type,
        published,
        sales,
        customers
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
        <Section>
            <Grid container direction="column">
                <Grid item>
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
                <Grid item>
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
                    <Grid item container justifyContent="center">
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
        </Section>
        // <StyledGrid container direction="column" spacing={2}>
        //     <Grid item xs={12}>
        //         <Section>
        //             <Grid
        //                 container
        //                 justifyContent="space-between"
        //                 alignItems="center"
        //                 spacing={1}
        //             >
        //                 <Grid item>
        //                     <Typography variant="h1">
        //                         {MANAGE_COURSES_PAGE_HEADING}
        //                     </Typography>
        //                 </Grid>
        //                 <Grid item>
        //                     {/* <form onSubmit={searchCourses}>
        //         <FormControl variant="outlined">
        //           <InputLabel htmlFor="searchtext">
        //             {SEARCH_TEXTBOX_PLACEHOLDER}
        //           </InputLabel>
        //           <OutlinedInput
        //             id="searchtext"
        //             type="text"
        //             value={searchText}
        //             onChange={(e) => setSearchText(e.target.value)}
        //             endAdornment={
        //               <InputAdornment position="end">
        //                 <IconButton
        //                   aria-label="search"
        //                   edge="end"
        //                   type="submit"
        //                   size="large"
        //                 >
        //                   <Search />
        //                 </IconButton>
        //               </InputAdornment>
        //             }
        //           />
        //         </FormControl>
        //       </form> */}
        //                 </Grid>
        //             </Grid>
        //         </Section>
        //     </Grid>
        //     <Grid item xs={12}>
        //         <Section>
        //             <Grid container direction="column">
        //                 {checkPermission(props.profile.permissions, [
        //                     permissions.manageCourse,
        //                 ]) && (
        //                     <Grid item>
        //                         <Link href="/dashboard/courses/edit">
        //                             <Button
        //                                 variant="outlined"
        //                                 color="primary"
        //                                 startIcon={<Add />}
        //                             >
        //                                 Add new
        //                             </Button>
        //                         </Link>
        //                     </Grid>
        //                 )}
        //                 <Grid item>
        //                     <List>
        //                         {creatorCourses.map((course, index) => (
        //                             <Link
        //                                 href={`/dashboard/courses/edit/${course.courseId}`}
        //                                 key={index}
        //                             >
        //                                 <ListItem
        //                                     className={classes.listItem}
        //                                     sx={{
        //                                         pr: 0,
        //                                         pl: 0,
        //                                     }}
        //                                 >
        //                                     <ListItemAvatar>
        //                                         <Image
        //                                             src={
        //                                                 course.featuredImage &&
        //                                                 course.featuredImage
        //                                                     .thumbnail
        //                                             }
        //                                             classes={classes.avatar}
        //                                         />
        //                                     </ListItemAvatar>
        //                                     <ListItemText
        //                                         primary={course.title}
        //                                         secondary={
        //                                             course.isBlog
        //                                                 ? COURSE_TYPE_BLOG
        //                                                 : COURSE_TYPE_COURSE
        //                                         }
        //                                         className={classes.listItemText}
        //                                     />
        //                                 </ListItem>
        //                             </Link>
        //                         ))}
        //                     </List>
        //                 </Grid>
        //                 <Grid item>
        //                     <Button
        //                         variant="outlined"
        //                         onClick={loadCreatorCourses}
        //                     >
        //                         {LOAD_MORE_TEXT}
        //                     </Button>
        //                 </Grid>
        //             </Grid>
        //         </Section>
        //     </Grid>
        // </StyledGrid>
    );
};

const mapStateToProps = (state: AppState) => ({
    auth: state.auth,
    profile: state.profile,
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(Index);
