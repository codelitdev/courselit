import React, { useState, useEffect } from "react";
import {
  Grid,
  IconButton,
  Typography,
  TextField,
  Button,
  Switch,
} from "@material-ui/core";
import { ExpandMore, ExpandLess, AccountCircle } from "@material-ui/icons";
import { connect } from "react-redux";
import {
  CAPTION_VERIFIED,
  CAPTION_UNVERIFIED,
  LABEL_NEW_PASSWORD,
  LABEL_CONF_PASSWORD,
  BUTTON_SAVE,
  SWITCH_IS_ADMIN,
  SWITCH_IS_CREATOR,
  SWITCH_ACCOUNT_ACTIVE,
  ERR_PASSWORDS_DONT_MATCH,
  ENROLLED_COURSES_HEADER,
  HEADER_RESET_PASSWORD,
} from "../../../config/strings";
import { makeStyles } from "@material-ui/styles";
import FetchBuilder from "../../../lib/fetch";
import { siteUser, authProps, addressProps } from "../../../types";
import { Card } from "@courselit/components-library";
import PropTypes from "prop-types";
import { networkAction } from "../../../redux/actions";

const useStyles = makeStyles((theme) => ({
  container: {
    padding: "0.8em 1.2em",
    marginBottom: "0.6em",
    background: "white",
  },
  error: {
    color: "#ff0000",
  },
  avatar: {
    height: "1.6em",
    width: "auto",
  },
  expanded: {
    marginTop: "1em",
  },
  enrolledCourseItem: {
    marginTop: theme.spacing(1),
  },
}));

const UserDetails = (props) => {
  const newUserDataDefaults = {
    isAdmin: props.user.isAdmin,
    isCreator: props.user.isCreator,
    active: props.user.active || false,
    password: "",
    confirmPassword: "",
  };
  const [expanded, setExpanded] = useState(false);
  const [userData, setUserData] = useState(props.user);
  const [newUserData, setNewUserData] = useState(newUserDataDefaults);
  const classes = useStyles();
  const [error, setError] = useState("");
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const { auth, address, dispatch } = props;

  useEffect(() => {
    setError(getUserDataError());
  }, [newUserData.confirmPassword, newUserData.password]);

  useEffect(() => {
    if (expanded) {
      getEnrolledCourses();
    }
  }, [expanded]);

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
      const response = await fetch.exec();
      setEnrolledCourses(response.enrolledCourses);
    } catch (err) {}
  };

  const getUserDataError = () => {
    if (
      (newUserData.password || newUserData.confirmPassword) &&
      newUserData.password !== newUserData.confirmPassword
    ) {
      return ERR_PASSWORDS_DONT_MATCH;
    }

    return "";
  };

  const toggleExpandedState = () => {
    setExpanded(!expanded);
  };

  const saveUserChanges = async (e) => {
    e.preventDefault();
    setError(getUserDataError());

    const mutation = `
    mutation {
        user: updateUser(userData: {
            id: "${userData.id}"
            ${getChangedFieldsForMutation()}
        }) { 
            id,
            email,
            name,
            verified,
            isCreator,
            isAdmin,
            avatar,
            purchases,
            active
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
        setNewUserData(getNewUserDataObject(response.user));
        setUserData(response.user);
      }
    } catch (err) {
      setError(err.message);
      setNewUserData(newUserDataDefaults);
    } finally {
      dispatch(networkAction(false));
    }
  };

  const getNewUserDataObject = (user) => ({
    isAdmin: user.isAdmin,
    isCreator: user.isCreator,
    active: user.active,
    password: "",
    confirmPassword: "",
  });

  const getChangedFieldsForMutation = () => {
    let otherFields = "";
    if (newUserData.password) {
      otherFields += `, password: "${newUserData.password}"`;
    }
    if (newUserData.isAdmin !== userData.isAdmin) {
      otherFields += `, isAdmin: ${newUserData.isAdmin}`;
    }
    if (newUserData.isCreator !== userData.isCreator) {
      otherFields += `, isCreator: ${newUserData.isCreator}`;
    }
    if (newUserData.active !== userData.active) {
      otherFields += `, active: ${newUserData.active}`;
    }

    return otherFields;
  };

  const isNewUserDataValid = () => {
    if (
      (newUserData.password || newUserData.confirmPassword) &&
      newUserData.password !== newUserData.confirmPassword
    ) {
      return false;
    }

    if (
      newUserData.password &&
      newUserData.password === newUserData.confirmPassword
    ) {
      return true;
    }

    if (userData.isAdmin !== newUserData.isAdmin) {
      return true;
    }

    if (userData.isCreator !== newUserData.isCreator) {
      return true;
    }

    if (userData.active !== newUserData.active) {
      return true;
    }

    return false;
  };

  const updateUserData = (key, value) =>
    setNewUserData(Object.assign({}, newUserData, { [key]: value }));

  return (
    <Card>
      <Grid container direction="column" className={classes.container}>
        <Grid
          container
          direction="row"
          justify="space-between"
          alignItems="center"
        >
          <Grid item>
            <Grid
              container
              item
              direction="row"
              alignItems="center"
              spacing={1}
            >
              <Grid item>
                <Grid container direction="column" alignItems="center">
                  <AccountCircle className={classes.avatar} />
                  <Typography variant="caption" color="textSecondary">
                    {props.user.verified
                      ? CAPTION_VERIFIED
                      : CAPTION_UNVERIFIED}
                  </Typography>
                </Grid>
              </Grid>
              <Grid item>
                <Grid
                  item
                  container
                  direction="row"
                  alignItems="center"
                  spacing={1}
                >
                  <Grid item>
                    <Typography variant="h6">{props.user.name}</Typography>
                  </Grid>
                  <Grid item>
                    <Typography variant="body2">
                      <a href={`mailto:${props.user.email}`}>
                        {props.user.email}
                      </a>
                    </Typography>
                  </Grid>
                </Grid>
                <Grid item container direction="row" spacing={1}>
                  {props.user.isAdmin && (
                    <Grid item>
                      <Typography variant="caption" color="textSecondary">
                        Admin
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          <Grid item>
            <IconButton onClick={toggleExpandedState}>
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Grid>
        </Grid>
        {expanded && (
          <>
            <Grid item className={classes.expanded}>
              <form onSubmit={saveUserChanges}>
                <Grid container direction="column">
                  <Grid container item>
                    <Grid
                      container
                      item
                      direction="row"
                      justify="space-between"
                      xs={12}
                      sm={4}
                    >
                      <Typography variant="subtitle1">
                        {SWITCH_IS_ADMIN}
                      </Typography>
                      <Switch
                        type="checkbox"
                        name="isAdmin"
                        checked={newUserData.isAdmin}
                        onChange={(e) =>
                          updateUserData("isAdmin", e.target.checked)
                        }
                      />
                    </Grid>
                    <Grid
                      container
                      item
                      direction="row"
                      justify="space-between"
                      xs={12}
                      sm={4}
                    >
                      <Typography variant="subtitle1">
                        {SWITCH_IS_CREATOR}
                      </Typography>
                      <Switch
                        type="checkbox"
                        name="isAdmin"
                        checked={newUserData.isCreator}
                        onChange={(e) =>
                          updateUserData("isCreator", e.target.checked)
                        }
                      />
                    </Grid>
                    <Grid
                      container
                      item
                      direction="row"
                      justify="space-between"
                      xs={12}
                      sm={4}
                    >
                      <Typography variant="subtitle1">
                        {SWITCH_ACCOUNT_ACTIVE}
                      </Typography>
                      <Switch
                        type="checkbox"
                        name="active"
                        checked={newUserData.active}
                        onChange={(e) =>
                          updateUserData("active", e.target.checked)
                        }
                      />
                    </Grid>
                  </Grid>
                  <Grid item>
                    <Typography variant="h6">
                      {HEADER_RESET_PASSWORD}
                    </Typography>
                  </Grid>
                  <Grid item>
                    <TextField
                      variant="outlined"
                      label={LABEL_NEW_PASSWORD}
                      fullWidth
                      margin="normal"
                      name="password"
                      type="password"
                      value={newUserData.password}
                      onChange={(e) =>
                        updateUserData("password", e.target.value)
                      }
                    />
                    <TextField
                      variant="outlined"
                      label={LABEL_CONF_PASSWORD}
                      fullWidth
                      margin="normal"
                      name="confirmPassword"
                      type="password"
                      value={newUserData.confirmPassword}
                      onChange={(e) =>
                        updateUserData("confirmPassword", e.target.value)
                      }
                    />
                  </Grid>
                  <Grid container item justify="flex-end" alignItems="center">
                    {error && (
                      <Grid item>
                        <Typography variant="caption" className={classes.error}>
                          {error}
                        </Typography>
                      </Grid>
                    )}
                    <Grid item>
                      <Button
                        color="primary"
                        onClick={saveUserChanges}
                        disabled={!isNewUserDataValid()}
                      >
                        {BUTTON_SAVE}
                      </Button>
                    </Grid>
                  </Grid>
                </Grid>
              </form>
            </Grid>
            {props.user.purchases.length > 0 && (
              <Grid item>
                <Typography variant="h6">
                  {ENROLLED_COURSES_HEADER} ({props.user.purchases.length})
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
              </Grid>
            )}
          </>
        )}
      </Grid>
    </Card>
  );
};

UserDetails.propTypes = {
  auth: authProps,
  user: siteUser,
  address: addressProps,
  dispatch: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  address: state.address,
});

const mapDispatchToProps = (dispatch) => ({
  dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(UserDetails);
