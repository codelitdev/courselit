import React, { FormEvent, useState } from "react";
import { AppMessage } from "@courselit/common-models";
import { Button, Grid, TextField, Typography } from "@mui/material";
import Settings from "./settings";
import { actionCreators } from "@courselit/state-management";
import { FetchBuilder } from "@courselit/utils";
import { setAppMessage } from "@courselit/state-management/dist/action-creators";
import {
    DEFAULT_BTN_TEXT,
    DEFAULT_FAILURE_MESSAGE,
    DEFAULT_SUCCESS_MESSAGE,
    DEFAULT_TITLE,
} from "./constants";
import type { AppState, AppDispatch } from "@courselit/state-management";

export interface WidgetProps {
    settings: Settings;
    state: AppState;
    dispatch: AppDispatch;
}

const Widget = ({
    settings: {
        title,
        subtitle = "Sign up here to get the latest articles, news and updates.",
        btnText,
        backgroundColor = "#eee",
        foregroundColor,
        btnBackgroundColor,
        btnForegroundColor,
        alignment = "left",
        successMessage,
        failureMessage,
    },
    state,
    dispatch,
}: WidgetProps) => {
    const [email, setEmail] = useState("");
    const submitEmail = async () => {};
    const justifyContent =
        alignment === "center"
            ? "center"
            : alignment === "right"
            ? "flex-end"
            : "flex-start";

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();

        const mutation = `
            mutation {
                response: createSubscription(email: "${email}")
            }
        `;

        const fetch = new FetchBuilder()
            .setUrl(`${state.address.backend}/api/graph`)
            .setPayload(mutation)
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            dispatch(actionCreators.networkAction(true));
            const response = await fetch.exec();
            if (response.response) {
                dispatch(
                    setAppMessage(
                        new AppMessage(
                            successMessage || DEFAULT_SUCCESS_MESSAGE
                        )
                    )
                );
                setEmail("");
            } else {
                dispatch(
                    setAppMessage(
                        new AppMessage(
                            failureMessage || DEFAULT_FAILURE_MESSAGE
                        )
                    )
                );
            }
        } catch (e) {
            console.error(e.message);
        } finally {
            dispatch(actionCreators.networkAction(false));
        }
    };

    return (
        <form onSubmit={onSubmit}>
            <Grid
                container
                direction="column"
                alignItems={justifyContent}
                sx={{
                    p: 2,
                    backgroundColor,
                    color: foregroundColor,
                }}
            >
                <Grid item sx={{ mb: 2 }}>
                    <Typography variant="h4">
                        {title || DEFAULT_TITLE}
                    </Typography>
                </Grid>
                {subtitle && (
                    <Grid item sx={{ mb: 2 }}>
                        <Typography variant="subtitle1">{subtitle}</Typography>
                    </Grid>
                )}
                <Grid item sx={{ mb: 2 }}>
                    <TextField
                        label="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        type="email"
                        required
                    />
                </Grid>
                <Grid item>
                    <Button
                        sx={{
                            backgroundColor: btnBackgroundColor,
                            color: btnForegroundColor,
                        }}
                        type="submit"
                        disabled={state.networkAction}
                        size="large"
                        variant="contained"
                    >
                        {btnText || DEFAULT_BTN_TEXT}
                    </Button>
                </Grid>
            </Grid>
        </form>
    );
};

export default Widget;
