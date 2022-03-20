import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  BTN_LOGIN,
  ERROR_SIGNIN_VERIFYING_LINK,
  LOGIN_SECTION_HEADER,
  ERROR_SIGNIN_GENERATING_LINK,
  SIGNIN_SUCCESS_PREFIX,
} from "../ui-config/strings"
import { Section } from "../components/ComponentsLibrary";
import { Grid, TextField, Button, Typography } from "@mui/material";
import { useRouter } from "next/router";
import Address from "../ui-models/address";
import Auth from "../ui-models/auth";
import State from "../ui-models/state";
import { connect } from "react-redux";
import { signedIn, networkAction, setAppMessage } from "../state/actions";
import AppMessage from "../ui-models/app-message";
import { ThunkDispatch } from "redux-thunk";
import { AnyAction } from 'redux';

const BaseLayout = dynamic(() => import("../components/Public/BaseLayout"));

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

  useEffect(() => {
    if (!auth.guest) {
      const { query } = router;
      console.log(query);
      query.redirect ? router.push(`${query.redirect}`) : router.push("/");
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
        dispatch(setAppMessage(new AppMessage(ERROR_SIGNIN_VERIFYING_LINK)));
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
      let response = await fetch('/api/auth/login', {
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
          setAppMessage(new AppMessage(`${SIGNIN_SUCCESS_PREFIX} ${email}`))
        );
        setEmail("");
      } else {
        dispatch(setAppMessage(new AppMessage(ERROR_SIGNIN_GENERATING_LINK)));
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
                    <Typography variant="h4">{LOGIN_SECTION_HEADER}</Typography>
                  </Grid>
                  <Grid item>
                    <TextField
                      type="email"
                      value={email}
                      variant="outlined"
                      label="Email"
                      fullWidth
                      margin="normal"
                      onChange={(e) => setEmail(e.target.value)}
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
