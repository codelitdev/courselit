import React, { useState } from "react";
import { Button } from "@mui/material";
import { ENROLL_BUTTON_TEXT } from "../../../ui-config/strings";
import { connect } from "react-redux";
import { useRouter } from "next/router";
import { actionCreators } from "@courselit/state-management";
import type { Address, Auth, Course } from "@courselit/common-models";
import { AppMessage } from "@courselit/common-models";
import type { AppDispatch, AppState } from "@courselit/state-management";
import { FetchBuilder } from "@courselit/utils";

const { networkAction, setAppMessage } = actionCreators;

interface FreeProps {
    course: Course;
    auth: Auth;
    dispatch: AppDispatch;
    address: Address;
}

const Free = ({ course, auth, dispatch, address }: FreeProps) => {
    const router = useRouter();
    const [disabled, setDisabled] = useState(false);

    const handleClick = async () => {
        const payload = {
            courseid: course.courseId,
        };
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/payment/initiate`)
            .setHeaders({
                "Content-Type": "application/json",
            })
            .setPayload(JSON.stringify(payload))
            .build();

        try {
            setDisabled(true);
            dispatch(networkAction(true));

            const response = await fetch.exec({
                redirectToOnUnAuth: router.asPath,
            });

            if (response.status === "success") {
                router.reload();
            } else if (response.status === "failed") {
                dispatch(setAppMessage(new AppMessage(response.error)));
            }
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
            setDisabled(false);
        }
    };

    return (
        <Button
            onClick={handleClick}
            variant="outlined"
            color="primary"
            disabled={disabled}
            size="large"
        >
            {ENROLL_BUTTON_TEXT}
        </Button>
    );
};

const mapStateToProps = (state: AppState) => ({
    auth: state.auth,
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(Free);
