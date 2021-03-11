import BaseLayout from "../../components/Public/BaseLayout";
import FetchBuilder from "../../lib/fetch";
import { Button, Grid, TextField, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import {
  PROFILE_PAGE_HEADER,
  PROFILE_SECTION_DETAILS_NAME,
  PROFILE_SECTION_DETAILS_BIO,
  PROFILE_SECTION_DETAILS_BIO_EMPTY,
  PROFILE_SECTION_DETAILS_EMAIL,
  PROFILE_MY_COURSES,
  PROFILE_PAGE_NOT_ENROLLED,
  PROFILE_PAGE_BROWSE_COURSES_TEXT,
  BUTTON_SAVE,
} from "../../config/strings";
import { connect } from "react-redux";
import Link from "next/link";
import { useState } from "react";
import { networkAction, refreshUserProfile } from "../../redux/actions";
import { getBackendAddress } from "../../lib/utils";

const useStyles = makeStyles((theme) => ({
  content: {
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(2),
    },
    paddingTop: theme.spacing(2),
  },
  leftMargin: {
    [theme.breakpoints.up("md")]: {
      paddingLeft: theme.spacing(2),
    },
  },
  headerTop: {
    marginBottom: theme.spacing(2),
  },
}));

function Profile({ user, profile, auth, dispatch, address }) {
  const classes = useStyles();
  const isMyProfile = profile && profile.id === user.id;
  const [bio, setBio] = useState(user.bio || "");
  const [name, setName] = useState(user.name || "");

  const saveDetails = async () => {
    const graphQuery = `
      mutation {
        user: updateUser(userData: {
          id: "${profile.id}"
          name: "${name}",
          bio: "${bio}"
        }) {
          id,
          bio
        }
      }
    `;
    const fetch = new FetchBuilder()
      .setUrl(`${address.backend}/graph`)
      .setPayload(graphQuery)
      .setIsGraphQLEndpoint(true)
      .setAuthToken(auth.token)
      .build();

    try {
      dispatch(networkAction(true));
      await fetch.exec();
      if (isMyProfile) {
        dispatch(refreshUserProfile());
      }
    } catch (err) {
    } finally {
      dispatch(networkAction(false));
    }
  };

  return (
    <BaseLayout title={user.name}>
      <Grid item xs={12} className={classes.content}>
        <Grid container component="section" className={classes.leftMargin}>
          <Grid item xs={12}>
            <Typography variant="h1" className={classes.headerTop}>
              {PROFILE_PAGE_HEADER}
            </Typography>
          </Grid>
          {user.id && (
            <Grid item container direction="column" spacing={4}>
              <Grid item container spacing={2}>
                {isMyProfile && (
                  <Grid item container direction="column" spacing={1}>
                    <Grid item>
                      <Typography variant="h6">
                        {PROFILE_SECTION_DETAILS_EMAIL}
                      </Typography>
                    </Grid>
                    <Grid item>
                      <Typography variant="body1" color="textSecondary">
                        {profile.email}
                      </Typography>
                    </Grid>
                  </Grid>
                )}
                <Grid item container direction="column" spacing={1}>
                  <Grid item>
                    <Typography variant="h6">
                      {PROFILE_SECTION_DETAILS_NAME}
                    </Typography>
                  </Grid>
                  <Grid item>
                    {!isMyProfile && (
                      <Typography variant="body1" color="textSecondary">
                        {user.name}
                      </Typography>
                    )}
                    {isMyProfile && (
                      <TextField
                        variant="outlined"
                        fullWidth
                        margin="normal"
                        name="name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        required
                      />
                    )}
                  </Grid>
                </Grid>
                <Grid item container direction="column" spacing={1}>
                  <Grid item>
                    <Typography variant="h6">
                      {PROFILE_SECTION_DETAILS_BIO}
                    </Typography>
                  </Grid>
                  <Grid item>
                    {!isMyProfile && (
                      <Typography variant="body1" color="textSecondary">
                        {user.bio || PROFILE_SECTION_DETAILS_BIO_EMPTY}
                      </Typography>
                    )}
                    {isMyProfile && (
                      <TextField
                        variant="outlined"
                        fullWidth
                        margin="normal"
                        name="bio"
                        value={bio}
                        onChange={(event) => setBio(event.target.value)}
                        multiline={true}
                        rowsMax={5}
                        required
                      />
                    )}
                  </Grid>
                </Grid>
                {isMyProfile && (
                  <Grid item>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={saveDetails}
                      disabled={bio === user.bio && name === user.name}
                    >
                      {BUTTON_SAVE}
                    </Button>
                  </Grid>
                )}
              </Grid>

              {isMyProfile && (
                <Grid item container spacing={2} direction="column">
                  <Grid item>
                    <Typography variant="h2">{PROFILE_MY_COURSES}</Typography>
                  </Grid>
                  {profile.purchases.length > 0 && (
                    <Grid item>
                      {profile.purchases.map((course) => (
                        <Typography key={course.id}>{course.title}</Typography>
                      ))}
                    </Grid>
                  )}
                  {profile.purchases.length <= 0 && (
                    <Grid item>
                      <Typography>
                        {PROFILE_PAGE_NOT_ENROLLED}{" "}
                        <Link href="/courses">
                          <a>{PROFILE_PAGE_BROWSE_COURSES_TEXT}</a>
                        </Link>
                        .
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              )}
            </Grid>
          )}
          {!user.id && (
            <Typography variant="body1" className={classes.leftMargin}>
              {user.name}
            </Typography>
          )}
        </Grid>
      </Grid>
    </BaseLayout>
  );
}

export async function getServerSideProps({ query, req }) {
  const graphQuery = `
    query {
      user: getUser(userId: "${query.userId}") {
        id,
        userId,
        email,
        name,
        bio
      }
    }
  `;
  const fetch = new FetchBuilder()
    .setUrl(`${getBackendAddress(req.headers.host)}/graph`)
    .setPayload(graphQuery)
    .setIsGraphQLEndpoint(true)
    .build();

  let user = null;
  try {
    const response = await fetch.exec();
    user = response.user;
  } catch (err) {
    user = {
      name: err.message,
    };
  }

  return {
    props: {
      user,
    },
  };
}

const mapStateToProps = (state) => ({
  profile: state.profile,
  auth: state.auth,
  address: state.address,
});

const mapDispatchToProps = (dispatch) => ({
  dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(Profile);
