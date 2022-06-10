import { useEffect, useState } from "react";
import {
    BTN_LOGIN,
    ERROR_SIGNIN_VERIFYING_LINK,
    LOGIN_SECTION_HEADER,
    ERROR_SIGNIN_GENERATING_LINK,
    SIGNIN_SUCCESS_PREFIX,
} from "../ui-config/strings";
import { Section } from "@courselit/components-library";
import { Grid, TextField, Button, Typography } from "@mui/material";
import { useRouter } from "next/router";
import type { Address, Auth, State } from "@courselit/common-models";
import { AppMessage } from "@courselit/common-models";
import { connect } from "react-redux";
import { actionCreators } from "@courselit/state-management";
import type { ThunkDispatch } from "redux-thunk";
import type { AnyAction } from "redux";
import BaseLayout from "../components/public/base-layout";

interface LoginProps {
    address: Address;
    auth: Auth;
    dispatch: any;
    progress: boolean;
}

const Login = ({ address, auth, dispatch, progress }: LoginProps) => {
    const [email, setEmail] = useState("");
    const router = useRouter();
    const { token, redirect } = router.query;
    const { signedIn, networkAction, setAppMessage } = actionCreators;

    useEffect(() => {
        if (!auth.guest) {
            const { query } = router;
            query.redirect
                ? router.push(`${query.redirect}`)
                : router.push("/");
        }
    });

    useEffect(() => {
        if (!router.isReady) return;
        if (token) {
            signIn();
        }
    }, [router.isReady]);

    const signIn = async () => {
        try {
            dispatch(networkAction(true));
            const response = await fetch(`/api/auth/login?token=${token}`);

            if (response.status === 200) {
                (dispatch as ThunkDispatch<State, {}, AnyAction>)(signedIn());
            } else {
                dispatch(
                    setAppMessage(new AppMessage(ERROR_SIGNIN_VERIFYING_LINK))
                );
            }
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    const requestMagicLink = async (e: Event) => {
        e.preventDefault();

        try {
            dispatch(networkAction(true));
            let response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    redirect,
                }),
            });

            if (response.status === 200) {
                response = await response.json();
                dispatch(
                    setAppMessage(
                        new AppMessage(`${SIGNIN_SUCCESS_PREFIX} ${email}`)
                    )
                );
                setEmail("");
            } else {
                dispatch(
                    setAppMessage(new AppMessage(ERROR_SIGNIN_GENERATING_LINK))
                );
            }
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    return (
        <BaseLayout title={LOGIN_SECTION_HEADER}>
            <Section>
                <Grid item xs={12}>
                    <Grid container direction="row">
                        <Grid item xs={12}>
                            <form onSubmit={requestMagicLink}>
                                <Grid container direction="column" spacing={1}>
                                    <Grid item>
                                        <Typography variant="h4">
                                            {LOGIN_SECTION_HEADER}
                                        </Typography>
                                    </Grid>
                                    <Grid item>
                                        <TextField
                                            type="email"
                                            value={email}
                                            variant="outlined"
                                            label="Email"
                                            fullWidth
                                            margin="normal"
                                            onChange={(e) =>
                                                setEmail(e.target.value)
                                            }
                                            required
                                        />
                                    </Grid>
                                    <Grid item>
                                        <Button
                                            variant="outlined"
                                            type="submit"
                                            color="primary"
                                            disabled={progress || !email}
                                        >
                                            {BTN_LOGIN}
                                        </Button>
                                    </Grid>
                                </Grid>
                            </form>
                        </Grid>
                    </Grid>
                </Grid>
            </Section>
        </BaseLayout>
    );
};

const mapStateToProps = (state: State) => ({
    auth: state.auth,
    address: state.address,
    progress: state.networkAction,
});

const mapDispatchToProps = (dispatch: any) => ({
    dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(Login);
