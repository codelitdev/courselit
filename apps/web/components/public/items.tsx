import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { FetchBuilder } from "@courselit/utils";
import { BTN_LOAD_MORE, FREE_COST } from "../../ui-config/strings";
import type { AppDispatch, AppState } from "@courselit/state-management";
import { actionCreators } from "@courselit/state-management";
import type {
    Address,
    Course as CourseModel,
    SiteInfo,
} from "@courselit/common-models";
import { CourseItem, Button } from "@courselit/components-library";

const { networkAction } = actionCreators;

interface ListProps {
    generateQuery: (...args: any[]) => void;
    initialItems: any[];
    showLoadMoreButton: boolean;
    dispatch: AppDispatch;
    posts?: boolean;
    address: Address;
    siteInfo: SiteInfo;
}

const List = (props: ListProps) => {
    const [courses, setCourses] = useState<CourseModel[]>(
        props.initialItems || [],
    );
    const [offset, setOffset] = useState(2);
    const [shouldShowLoadMoreButton, setShouldShowLoadMoreButton] = useState(
        typeof props.showLoadMoreButton === "boolean"
            ? props.showLoadMoreButton
            : false,
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

    if (courses.length === 0) {
        return null;
    }

    return (
        <>
            <div className="flex flex-wrap gap-[1%]">
                {courses.map((course: CourseModel, index: number) => (
                    <div
                        className="basis-full md:basis-[49.5%] lg:basis-[32.6666%] mb-6"
                        key={index}
                    >
                        <CourseItem
                            course={course}
                            siteInfo={siteInfo}
                            freeCostCaption={FREE_COST}
                        />
                    </div>
                ))}
            </div>
            {shouldShowLoadMoreButton && courses.length > 0 && (
                <div>
                    <Button
                        variant="soft"
                        onClick={() => setOffset(offset + 1)}
                    >
                        {BTN_LOAD_MORE}
                    </Button>
                </div>
            )}
        </>
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
