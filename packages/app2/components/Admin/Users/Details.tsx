import React, { useState, useEffect } from "react";
import { styled } from "@mui/material/styles";
import { Grid, Typography, Switch } from "@mui/material";
import { connect } from "react-redux";
import {
  SWITCH_ACCOUNT_ACTIVE,
  ENROLLED_COURSES_HEADER,
} from "../../../ui-config/strings";
import FetchBuilder from "../../../ui-lib/fetch";
import { networkAction, setAppMessage } from "../../../state/actions";
import AppMessage from "../../../ui-models/app-message";
import { Section } from "@courselit/components-library";
import PermissionsEditor from "./PermissionsEditor";
import Address from "../../../ui-models/address";
import Auth from "../../../ui-models/auth";
import { AppDispatch } from "../../../state/store";
import State from "../../../ui-models/state";
import { ThunkDispatch } from "redux-thunk";
import { AnyAction } from "redux";

const PREFIX = "Details";

const classes = {
  container: `${PREFIX}-container`,
  enrolledCourseItem: `${PREFIX}-enrolledCourseItem`,
  fullHeight: `${PREFIX}-fullHeight`,
};

// TODO jss-to-styled codemod: The Fragment root was replaced by div. Change the tag if needed.
const Root = styled("div")(({ theme }: { theme: any }) => ({
  [`& .${classes.container}`]: {},

  [`& .${classes.enrolledCourseItem}`]: {
    marginTop: theme.spacing(1),
  },

  [`& .${classes.fullHeight}`]: {
    height: "100%",
  },
}));

interface DetailsProps {
  userId: string;
  auth: Auth;
  address: Address;
  dispatch: ThunkDispatch<State, null, AnyAction>;
}

const Details = ({ userId, auth, address, dispatch }: DetailsProps) => {
  const [userData, setUserData] = useState({
    id: "",
    email: "",
    name: "",
    purchases: [],
    active: false,
    permissions: [],
    userId: "",
  });
  const [enrolledCourses, setEnrolledCourses] = useState([]);

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
            purchases,
            active,
            permissions,
            userId
         }
    }
    `;
    const fetch = new FetchBuilder()
      .setUrl(`${address.backend}/api/graph`)
      .setPayload(query)
      .setIsGraphQLEndpoint(true)
      .build();
    try {
      dispatch(networkAction(true));
      const response = await fetch.exec();
      if (response.user) {
        setUserData(response.user);
      }
    } catch (err: any) {
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
      .setUrl(`${address.backend}/api/graph`)
      .setPayload(query)
      .setIsGraphQLEndpoint(true)
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

  const toggleActiveState = async (value: boolean) => {
    const mutation = `
    mutation {
      user: updateUser(userData: {
          id: "${userData.id}"
          active: ${value}
      }) { 
        id,
        email,
        name,
        purchases,
        active,
        permissions,
        userId
      }
    }
    `;
    const fetch = new FetchBuilder()
      .setUrl(`${address.backend}/api/graph`)
      .setPayload(mutation)
      .setIsGraphQLEndpoint(true)
      .build();
    try {
      dispatch(networkAction(true));
      const response = await fetch.exec();
      if (response.user) {
        setUserData(response.user);
      }
    } catch (err: any) {
      dispatch(setAppMessage(new AppMessage(err.message)));
    } finally {
      dispatch(networkAction(false));
    }
  };

  return (
    <Root>
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
                  justifyContent="center"
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
                    justifyContent="space-between"
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
                </Grid>
              </Section>
            </Grid>
          </Grid>
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
    </Root>
  );
};

const mapStateToProps = (state: State) => ({
  auth: state.auth,
  address: state.address,
  profile: state.profile,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(Details);
