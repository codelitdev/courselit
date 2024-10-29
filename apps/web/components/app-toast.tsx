import React from "react";
import { connect } from "react-redux";
import { actionCreators } from "@courselit/state-management";
import type { AppDispatch, AppState } from "@courselit/state-management";
import { Toast } from "@courselit/components-library";
import { Message } from "@courselit/common-models";

const { clearAppMessage } = actionCreators;

interface AppToastProps {
    message: Message;
    dispatch: any;
}

export const AppToast = (props: AppToastProps) => {
    const { message, dispatch } = props;

    /*
    const handleClose: any = (_: Event | SyntheticEvent, reason: string) => {
        if (reason === "clickaway") {
            return;
        }

        props.dispatch(clearAppMessage());
    };

    const getActionButtonsArray = () => {
        const actionButtonsArray = [
            <IconButton key="close" onClick={handleClose}>
                <Close />
            </IconButton>,
        ];
        if (action) {
            actionButtonsArray.unshift(
                <Button
                    key="action"
                    color="secondary"
                    size="small"
                    onClick={message.action!.cb}
                >
                    {message.action!.text}
                </Button>,
            );
        }

        return actionButtonsArray;
    };
    */
    return (
        <Toast
            message={message}
            dispatch={dispatch}
            clearMessageAction={clearAppMessage}
        />
    );
};

const mapStateToProps = (state: AppState) => ({
    message: state.message,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(AppToast);
