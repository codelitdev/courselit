import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { FetchBuilder } from "@courselit/utils";
import { Grid, Button } from "@mui/material";
import { BTN_LOAD_MORE, FREE_COST } from "../../ui-config/strings";
import type { AppDispatch, AppState } from "@courselit/state-management";
import { actionCreators } from "@courselit/state-management";
import type {
    Address,
    Course as CourseModel,
    SiteInfo,
} from "@courselit/common-models";
import { CourseItem } from "@courselit/components-library";

const { networkAction } = actionCreators;

interface ListProps {
    generateQuery: (...args: any[]) => void;
    initialItems: any[];
    showLoadMoreButton: boolean;
    dispatch: AppDispatch;
    posts: boolean;
    address: Address;
    siteInfo: SiteInfo;
}

const List = (props: ListProps) => {
    const [courses, setCourses] = useState<CourseModel[]>(
        props.initialItems || []
    );
    const [offset, setOffset] = useState(2);
    const [shouldShowLoadMoreButton, setShouldShowLoadMoreButton] = useState(
        typeof props.showLoadMoreButton === "boolean"
            ? props.showLoadMoreButton
            : false
    );
    const { generateQuery, siteInfo } = props;
    const posts = typeof props.posts === "boolean" ? props.posts : false;

    useEffect(() => {
        getPosts();
    }, [offset]);

    const getPosts = async () => {
        try {
            props.dispatch && props.dispatch(networkAction(true));
            const fetch = new FetchBuilder()
                .setUrl(`${props.address.backend}/api/graph`)
                .setPayload(generateQuery(offset))
                .setIsGraphQLEndpoint(true)
                .build();
            const response = await fetch.exec();
            if (response.courses) {
                if (response.courses.length > 0) {
                    setCourses([...courses, ...response.courses]);
                } else {
                    setShouldShowLoadMoreButton(false);
                }
            }
        } finally {
            props.dispatch && props.dispatch(networkAction(false));
        }
    };

    return courses.length > 0 ? (
        <>
            <Grid container justifyContent="space-between" spacing={2}>
                {courses.map((course: CourseModel, index: number) => (
                    <CourseItem
                        course={course}
                        siteInfo={siteInfo}
                        freeCostCaption={FREE_COST}
                        key={index}
                    />
                ))}
            </Grid>
            {shouldShowLoadMoreButton && courses.length > 0 && (
                <Grid item xs={12}>
                    <Button
                        variant="outlined"
                        disableElevation
                        onClick={() => setOffset(offset + 1)}
                    >
                        {BTN_LOAD_MORE}
                    </Button>
                </Grid>
            )}
        </>
    ) : (
        <></>
    );
};

const mapStateToProps = (state: AppState) => ({
    siteInfo: state.siteinfo,
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(List);
