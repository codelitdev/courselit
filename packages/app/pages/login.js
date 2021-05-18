import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  BTN_LOGIN,
  ERROR_SIGNIN_VERIFYING_LINK,
  LOGIN_SECTION_HEADER,
  ERROR_SIGNIN_GENERATING_LINK,
  SIGNIN_SUCCESS_PREFIX,
} from "../config/strings";
import { Section } from "@courselit/components-library";
import { Grid, TextField, Button, Typography } from "@material-ui/core";
import { useRouter } from "next/router";
import { connect } from "react-redux";
import fetch from "isomorphic-unfetch";
import { signedIn, networkAction, setAppMessage } from "../redux/actions.js";
import AppMessage from "../models/app-message.js";
import { JWT_COOKIE_NAME, USERID_COOKIE_NAME } from "../config/constants";
import { setCookie } from "../lib/session";

const BaseLayout = dynamic(() => import("../components/Public/BaseLayout"));

const Login = ({ address, auth, dispatch, progress }) => {
  const [email, setEmail] = useState("");
  const router = useRouter();
  const { token } = router.query;

  useEffect(() => {
    if (!auth.guest) {
      const { query } = router;
      query.redirect ? router.push(`${query.redirect}`) : router.push("/");
    }
  });

  useEffect(() => {
    if (token) {
      signIn();
    }
  }, []);

  const signIn = async () => {
    try {
      dispatch(networkAction(true));
      let response = await fetch(
        `${address.backend}/auth/magiclink/callback?token=${token}`
      );

      if (response.status === 200) {
        response = await response.json();
        const { email, token, message } = response;

        if (token) {
          setCookie({
            key: JWT_COOKIE_NAME,
            value: token,
            domain: address.domain,
          });
          setCookie({
            key: USERID_COOKIE_NAME,
            value: email,
            domain: address.domain,
          });
          dispatch(signedIn(email, token));
        } else {
          dispatch(setAppMessage(new AppMessage(message)));
        }
      } else {
        dispatch(setAppMessage(new AppMessage(ERROR_SIGNIN_VERIFYING_LINK)));
      }
    } catch (err) {
      dispatch(setAppMessage(new AppMessage(err.message)));
    } finally {
      dispatch(networkAction(false));
    }
  };

  const requestMagicLink = async (e) => {
    e.preventDefault();

    try {
      dispatch(networkAction(true));
      const response = await fetch(`${address.backend}/auth/magiclink`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (response.status === 200) {
        dispatch(
          setAppMessage(new AppMessage(`${SIGNIN_SUCCESS_PREFIX} ${email}`))
        );
        setEmail("");
      } else {
        dispatch(setAppMessage(new AppMessage(ERROR_SIGNIN_GENERATING_LINK)));
      }
    } catch (err) {
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
                      variant="contained"
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

const mapStateToProps = (state) => ({
  auth: state.auth,
  address: state.address,
  progress: state.networkAction,
});

const mapDispatchToProps = (dispatch) => ({
  dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(Login);
