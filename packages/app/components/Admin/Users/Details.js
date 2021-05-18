import React, { useState, useEffect } from "react";
import { Grid, Typography, TextField, Button, Switch } from "@material-ui/core";
import { connect } from "react-redux";
import {
  LABEL_NEW_PASSWORD,
  LABEL_CONF_PASSWORD,
  SWITCH_ACCOUNT_ACTIVE,
  ENROLLED_COURSES_HEADER,
  HEADER_RESET_PASSWORD,
  BTN_RESET,
  APP_MESSAGE_CHANGES_SAVED,
} from "../../../config/strings";
import { makeStyles } from "@material-ui/styles";
import FetchBuilder from "../../../lib/fetch";
import { authProps, addressProps } from "../../../types";
import PropTypes from "prop-types";
import { networkAction, setAppMessage } from "../../../redux/actions";
import AppMessage from "../../../models/app-message.js";
import { Section } from "@courselit/components-library";
import PermissionsEditor from "./PermissionsEditor";

const useStyles = makeStyles((theme) => ({
  container: {},
  avatar: {
    height: "1.6em",
    width: "auto",
  },
  enrolledCourseItem: {
    marginTop: theme.spacing(1),
  },
  fullHeight: {
    height: "100%",
  },
}));

const Details = ({ userId, auth, address, dispatch }) => {
  const [userData, setUserData] = useState({
    id: "",
    email: "",
    name: "",
    avatar: "",
    purchases: [],
    active: false,
    permissions: [],
    userId: "",
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [enrolledCourses, setEnrolledCourses] = useState([]);

  const classes = useStyles();

  useEffect(() => {
    getUserDetails();
  }, [userId]);

  useEffect(() => {
    getEnrolledCourses();
  }, []);

  const getUserDetails = async () => {
    const query = `
    query {
        user: getUser(userId: "${userId}") { 
            id,
            email,
            name,
            avatar,
            purchases,
            active,
            permissions,
            userId
         }
    }
    `;
    const fetch = new FetchBuilder()
      .setUrl(`${address.backend}/graph`)
      .setPayload(query)
      .setIsGraphQLEndpoint(true)
      .setAuthToken(auth.token)
      .build();
    try {
      dispatch(networkAction(true));
      const response = await fetch.exec();
      if (response.user) {
        setUserData(response.user);
      }
    } catch (err) {
      dispatch(setAppMessage(new AppMessage(err.message)));
    } finally {
      dispatch(networkAction(false));
    }
  };

  // TODO: test this method. A hard-coded userId was there in the query.
  const getEnrolledCourses = async () => {
    const query = `
    query {
      enrolledCourses: getEnrolledCourses(userId: "${userData.id}") {
        id,
        title
      }
    }
    `;
    const fetch = new FetchBuilder()
      .setUrl(`${address.backend}/graph`)
      .setPayload(query)
      .setIsGraphQLEndpoint(true)
      .setAuthToken(auth.token)
      .build();
    try {
      dispatch(networkAction(true));
      const response = await fetch.exec();
      setEnrolledCourses(response.enrolledCourses);
    } catch (err) {
    } finally {
      dispatch(networkAction(false));
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();

    const mutation = `
    mutation {
        user: updateUser(userData: {
            id: "${userData.id}"
            password: "${password}"
        }) { 
          id
        }
    }
    `;

    const fetch = new FetchBuilder()
      .setUrl(`${address.backend}/graph`)
      .setPayload(mutation)
      .setIsGraphQLEndpoint(true)
      .setAuthToken(auth.token)
      .build();

    try {
      dispatch(networkAction(true));
      const response = await fetch.exec();
      if (response.user) {
        dispatch(setAppMessage(new AppMessage(APP_MESSAGE_CHANGES_SAVED)));
        setPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      dispatch(setAppMessage(new AppMessage(err.message)));
    } finally {
      dispatch(networkAction(false));
    }
  };

  const isPasswordValid = () => {
    if ((password || confirmPassword) && password !== confirmPassword) {
      return false;
    }

    if (password && password === confirmPassword) {
      return true;
    }

    return false;
  };

  const toggleActiveState = async (value) => {
    const mutation = `
    mutation {
        user: updateUser(userData: {
            id: "${userData.id}"
            active: ${value}
        }) { 
          id,
          email,
          name,
          avatar,
          purchases,
          active,
          permissions,
          userId
        }
    }
    `;
    const fetch = new FetchBuilder()
      .setUrl(`${address.backend}/graph`)
      .setPayload(mutation)
      .setIsGraphQLEndpoint(true)
      .setAuthToken(auth.token)
      .build();
    try {
      dispatch(networkAction(true));
      const response = await fetch.exec();
      if (response.user) {
        setUserData(response.user);
      }
    } catch (err) {
      dispatch(setAppMessage(new AppMessage(err.message)));
    } finally {
      dispatch(networkAction(false));
    }
  };

  return (
    <>
      {userData && (
        <Grid
          container
          direction="column"
          className={classes.container}
          spacing={2}
        >
          <Grid item container spacing={2}>
            <Grid item xs={12} sm={4} md={3}>
              <Section className={classes.fullHeight}>
                <Grid
                  container
                  item
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  justify="center"
                >
                  <Grid item>
                    <Grid
                      item
                      container
                      direction="row"
                      alignItems="center"
                      spacing={1}
                    >
                      <Grid item>
                        <Typography variant="h6">{userData.name}</Typography>
                      </Grid>
                      <Grid item>
                        <Typography variant="body2">
                          <a href={`mailto:${userData.email}`}>
                            {userData.email}
                          </a>
                        </Typography>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </Section>
            </Grid>
            <Grid item xs={12} sm={8} md={9}>
              <Section>
                <Grid container direction="column">
                  <Grid
                    item
                    container
                    direction="row"
                    justify="space-between"
                    xs
                  >
                    <Typography variant="subtitle1">
                      {SWITCH_ACCOUNT_ACTIVE}
                    </Typography>
                    <Switch
                      type="checkbox"
                      name="active"
                      checked={userData.active}
                      onChange={(e) => toggleActiveState(e.target.checked)}
                    />
                  </Grid>
                  <Grid item>
                    <Typography variant="h6">
                      {HEADER_RESET_PASSWORD}
                    </Typography>
                  </Grid>
                  <form onSubmit={savePassword}>
                    <Grid item>
                      <TextField
                        variant="outlined"
                        label={LABEL_NEW_PASSWORD}
                        fullWidth
                        margin="normal"
                        name="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <TextField
                        variant="outlined"
                        label={LABEL_CONF_PASSWORD}
                        fullWidth
                        margin="normal"
                        name="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </Grid>
                    <Grid container item justify="flex-end" alignItems="center">
                      <Grid item>
                        <Button
                          color="primary"
                          onClick={savePassword}
                          disabled={!isPasswordValid()}
                        >
                          {BTN_RESET}
                        </Button>
                      </Grid>
                    </Grid>
                  </form>
                </Grid>
              </Section>
            </Grid>
          </Grid>

          <Grid item></Grid>

          <Grid item>
            <Section>
              <PermissionsEditor user={userData} />
            </Section>
          </Grid>

          {userData.purchases && userData.purchases.length > 0 && (
            <Grid item>
              <Section>
                <Typography variant="h6">
                  {ENROLLED_COURSES_HEADER} ({userData.purchases.length})
                </Typography>
                <Grid container direction="column">
                  {enrolledCourses.map((course) => (
                    <Grid
                      item
                      key={course.id}
                      className={classes.enrolledCourseItem}
                    >
                      {course.title}
                    </Grid>
                  ))}
                </Grid>
              </Section>
            </Grid>
          )}
        </Grid>
      )}
    </>
  );
};

Details.propTypes = {
  userId: PropTypes.number.isRequired,
  auth: authProps,
  address: addressProps,
  dispatch: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  address: state.address,
  profile: state.profile,
});

const mapDispatchToProps = (dispatch) => ({
  dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(Details);
