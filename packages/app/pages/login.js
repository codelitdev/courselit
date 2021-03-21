import { useState, useEffect } from "react";
import { connect } from "react-redux";
import { useRouter } from "next/router";
import {
  ERR_ALL_FIELDS_REQUIRED,
  ERR_PASSWORDS_DONT_MATCH,
  RESP_API_USER_CREATED,
  SIGNUP_SUCCESS,
  LOGIN_SECTION_HEADER,
  LOGIN_SECTION_BUTTON,
  SIGNUP_SECTION_HEADER,
  SIGNUP_SECTION_BUTTON,
  LOGIN_INSTEAD_BUTTON,
} from "../config/strings.js";
import { JWT_COOKIE_NAME, USERID_COOKIE_NAME } from "../config/constants.js";
import { signedIn, networkAction } from "../redux/actions.js";
import { setCookie } from "../lib/session.js";
import { Grid, TextField, Button, Typography } from "@material-ui/core";
import FetchBuilder from "../lib/fetch.js";
import { makeStyles } from "@material-ui/styles";
import BaseLayout from "../components/Public/BaseLayout";

const useStyles = makeStyles((theme) => ({
  content: {
    padding: theme.spacing(2),
    paddingTop: theme.spacing(8),
  },
}));

const Login = (props) => {
  const emptyStringPat = /^\s*$/;
  const defaultSignupData = {
    email: "",
    pass: "",
    conf: "",
    name: "",
    err: "",
    msg: "",
  };
  const defaultLoginData = { email: "", pass: "", err: "" };
  const [loginData, setLoginData] = useState(defaultLoginData);
  const [signupData, setSignupData] = useState(defaultSignupData);
  const [showSignupForm, setShowSignupForm] = useState(false);
  const classes = useStyles();
  const router = useRouter();
  const { address } = props;

  useEffect(() => {
    if (!props.auth.guest) {
      const { query } = router;
      query.redirect ? router.push(`${query.redirect}`) : router.push("/");
    }
  });

  async function handleLogin(event) {
    event.preventDefault();

    // validating the data
    if (!loginData.email || emptyStringPat.test(loginData.pass)) {
      return setLoginData(
        Object.assign({}, loginData, { err: ERR_ALL_FIELDS_REQUIRED })
      );
    }

    clearLoginErrors();

    try {
      props.dispatch(networkAction(true));

      const formData = new window.FormData();
      formData.append("email", loginData.email);
      formData.append("password", loginData.pass);

      const fetch = new FetchBuilder()
        .setUrl(`${address.backend}/auth/login`)
        .setPayload(formData)
        .build();
      const response = await fetch.exec();
      const { token, message } = response;

      if (token) {
        setCookie({
          key: JWT_COOKIE_NAME,
          value: token,
          domain: address.domain,
        });
        setCookie({
          key: USERID_COOKIE_NAME,
          value: loginData.email,
          domain: address.domain,
        });
        props.dispatch(signedIn(loginData.email, token));
      } else {
        setLoginData(Object.assign({}, loginData, { err: message }));
      }
    } catch (err) {
      setLoginData(Object.assign({}, loginData, { err: err.message }));
    } finally {
      props.dispatch(networkAction(false));
    }
  }

  function clearLoginErrors() {
    setLoginData(Object.assign({}, loginData, { err: "", msg: "" }));
  }

  async function handleSignup(event) {
    event.preventDefault();

    // validate the data
    if (
      !signupData.email ||
      emptyStringPat.test(signupData.pass) ||
      emptyStringPat.test(signupData.conf) ||
      !signupData.name
    ) {
      return setSignupData(
        Object.assign({}, signupData, { err: ERR_ALL_FIELDS_REQUIRED, msg: "" })
      );
    }

    if (signupData.pass !== signupData.conf) {
      return setSignupData(
        Object.assign({}, signupData, {
          err: ERR_PASSWORDS_DONT_MATCH,
          msg: "",
        })
      );
    }

    clearSignUpErrors();

    try {
      props.dispatch(networkAction(true));

      const formData = new window.FormData();
      formData.append("email", signupData.email);
      formData.append("password", signupData.pass);
      formData.append("name", signupData.name);

      const fetch = new FetchBuilder()
        .setUrl(`${address.backend}/auth/signup`)
        .setPayload(formData)
        .build();
      const response = await fetch.exec();
      const { message } = response;

      if (message === RESP_API_USER_CREATED) {
        setSignupData(
          Object.assign({}, defaultSignupData, {
            err: "",
            msg: SIGNUP_SUCCESS,
          })
        );
      } else {
        setSignupData(
          Object.assign({}, signupData, {
            err: message,
            msg: "",
          })
        );
      }
    } catch (err) {
      setSignupData(
        Object.assign({}, signupData, {
          err: err.message,
          msg: "",
        })
      );
    } finally {
      props.dispatch(networkAction(false));
    }
  }

  function clearSignUpErrors() {
    setSignupData(Object.assign({}, signupData, { err: "", msg: "" }));
  }

  return (
    <BaseLayout
      title={showSignupForm ? SIGNUP_SECTION_HEADER : LOGIN_SECTION_HEADER}
    >
      <Grid item xs={12} className={classes.content}>
        <Grid container direction="row">
          <Grid item xs={12}>
            {!showSignupForm && (
              <>
                <Typography variant="h4">{LOGIN_SECTION_HEADER}</Typography>
                <form onSubmit={handleLogin}>
                  {loginData.err && <div>{loginData.err}</div>}
                  <TextField
                    type="email"
                    value={loginData.email}
                    variant="outlined"
                    label="Email"
                    fullWidth
                    margin="normal"
                    onChange={(e) =>
                      setLoginData(
                        Object.assign({}, loginData, {
                          email: e.target.value,
                        })
                      )
                    }
                  />
                  <TextField
                    type="password"
                    value={loginData.pass}
                    variant="outlined"
                    label="Password"
                    fullWidth
                    margin="normal"
                    onChange={(e) =>
                      setLoginData(
                        Object.assign({}, loginData, {
                          pass: e.target.value,
                        })
                      )
                    }
                  />
                  <Grid container direction="row" justify="space-between">
                    <Grid item>
                      <Button variant="contained" type="submit" color="primary">
                        {LOGIN_SECTION_BUTTON}
                      </Button>
                    </Grid>
                    <Grid item>
                      <Button onClick={() => setShowSignupForm(true)}>
                        {SIGNUP_SECTION_HEADER}
                      </Button>
                    </Grid>
                  </Grid>
                </form>
              </>
            )}
            {showSignupForm && (
              <>
                <Typography variant="h4" className={classes.cardHeader}>
                  {SIGNUP_SECTION_HEADER}
                </Typography>
                <form onSubmit={handleSignup}>
                  {signupData.msg && <div>{signupData.msg}</div>}
                  {signupData.err && <div>{signupData.err}</div>}
                  <TextField
                    type="email"
                    value={signupData.email}
                    variant="outlined"
                    label="Email"
                    fullWidth
                    margin="normal"
                    onChange={(e) =>
                      setSignupData(
                        Object.assign({}, signupData, {
                          email: e.target.value,
                        })
                      )
                    }
                  />
                  <TextField
                    type="password"
                    value={signupData.pass}
                    variant="outlined"
                    label="Password"
                    fullWidth
                    margin="normal"
                    onChange={(e) =>
                      setSignupData(
                        Object.assign({}, signupData, {
                          pass: e.target.value,
                        })
                      )
                    }
                  />
                  <TextField
                    type="password"
                    value={signupData.conf}
                    variant="outlined"
                    label="Confirm password"
                    fullWidth
                    margin="normal"
                    onChange={(e) =>
                      setSignupData(
                        Object.assign({}, signupData, {
                          conf: e.target.value,
                        })
                      )
                    }
                  />
                  <TextField
                    type="name"
                    value={signupData.name}
                    variant="outlined"
                    label="Name"
                    fullWidth
                    margin="normal"
                    onChange={(e) =>
                      setSignupData(
                        Object.assign({}, signupData, {
                          name: e.target.value,
                        })
                      )
                    }
                  />
                  <Grid container direction="row" justify="space-between">
                    <Grid item>
                      <Button variant="contained" type="submit" color="primary">
                        {SIGNUP_SECTION_BUTTON}
                      </Button>
                    </Grid>
                    <Grid item>
                      <Button onClick={() => setShowSignupForm(false)}>
                        {LOGIN_INSTEAD_BUTTON}
                      </Button>
                    </Grid>
                  </Grid>
                </form>
              </>
            )}
          </Grid>
        </Grid>
      </Grid>
    </BaseLayout>
  );
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  address: state.address,
});

export default connect(mapStateToProps)(Login);
