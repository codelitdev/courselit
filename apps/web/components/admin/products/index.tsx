import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import {
    MANAGE_COURSES_PAGE_HEADING,
    PRODUCTS_TABLE_HEADER_NAME,
    PRODUCTS_TABLE_HEADER_STATUS,
    PRODUCTS_TABLE_HEADER_STUDENTS,
    PRODUCTS_TABLE_HEADER_SALES,
    PRODUCTS_TABLE_HEADER_ACTIONS,
    BTN_NEW_PRODUCT,
    PRODUCTS_TABLE_HEADER_TYPE,
} from "../../../ui-config/strings";
import { FetchBuilder } from "@courselit/utils";
import type { Address, SiteInfo } from "@courselit/common-models";
import { AppMessage } from "@courselit/common-models";
import type { AppDispatch, AppState } from "@courselit/state-management";
import { actionCreators } from "@courselit/state-management";
import Product, { CourseDetails } from "./product";
import {
    Link,
    Button,
    Table,
    TableHead,
    TableBody,
} from "@courselit/components-library";

const { networkAction, setAppMessage } = actionCreators;

interface IndexProps {
    dispatch?: AppDispatch;
    address: Address;
    loading: boolean;
    siteinfo: SiteInfo;
    prefix: string;
}

export const Index = ({
    loading,
    address,
    dispatch,
    siteinfo,
    prefix,
}: IndexProps) => {
    const [coursesPaginationOffset, setCoursesPaginationOffset] = useState(1);
    const [creatorCourses, setCreatorCourses] = useState([]);
    const [searchText, setSearchText] = useState("");
    const [searchState, setSearchState] = useState(0);
    const [endReached, setEndReached] = useState(false);

    useEffect(() => {
        loadCreatorCourses();
    }, []);

    useEffect(() => {
        loadCreatorCourses();
    }, [coursesPaginationOffset]);

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
        <div className="flex flex-col">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-semibold mb-4">
                    {MANAGE_COURSES_PAGE_HEADING}
                </h1>
                <div>
                    <Link href={`${prefix}/product/new`}>
                        <Button>{BTN_NEW_PRODUCT}</Button>
                    </Link>
                </div>
            </div>
            <Table aria-label="Products">
                <TableHead>
                    <td>{PRODUCTS_TABLE_HEADER_NAME}</td>
                    <td>{PRODUCTS_TABLE_HEADER_TYPE}</td>
                    <td align="right">{PRODUCTS_TABLE_HEADER_STATUS}</td>
                    <td align="right">{PRODUCTS_TABLE_HEADER_STUDENTS}</td>
                    <td align="right">{PRODUCTS_TABLE_HEADER_SALES}</td>
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
                        (product: CourseDetails, index: number) => (
                            <Product
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
        </div>
    );
};

const mapStateToProps = (state: AppState) => ({
    address: state.address,
    loading: state.networkAction,
    siteinfo: state.siteinfo,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(Index);
