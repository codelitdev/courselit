import { Grid, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import Link from "next/link";
import { connect } from "react-redux";
import BaseLayout from "../components/Public/BaseLayout";
import {
  HEADER_YOUR_PROFILE,
  LOGIN_SECTION_BUTTON,
  PROFILE_PAGE_HEADER,
  PROFILE_PAGE_MESSAGE_NOT_LOGGED_IN,
  PROFILE_MY_COURSES,
  PROFILE_PAGE_NOT_ENROLLED,
  PROFILE_PAGE_BROWSE_COURSES_TEXT,
} from "../config/strings";

const useStyles = makeStyles((theme) => ({
  content: {
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(2),
    },
    paddingTop: theme.spacing(2),
  },
  leftMargin: {
    [theme.breakpoints.up("md")]: {
      marginLeft: theme.spacing(2),
    },
  },
  headerTop: {
    marginBottom: theme.spacing(2),
  },
  section: {},
}));

function Profile({ profile }) {
  const classes = useStyles();

  return (
    <BaseLayout title={HEADER_YOUR_PROFILE}>
      <Grid item xs={12} className={classes.content}>
        <Grid container component="section">
          <Grid item container className={classes.leftMargin}>
            <Grid item xs={12} className={classes.headerTop}>
              <Typography variant="h1">{PROFILE_PAGE_HEADER}</Typography>
            </Grid>
          </Grid>
          {profile.email && (
            <Grid container className={classes.leftMargin} spacing={2}>
              <Grid item container spacing={2} className={classes.section}>
                <Grid item container direction="column" spacing={1}>
                  <Grid item>
                    <Typography variant="h6">Name</Typography>
                  </Grid>
                  <Grid item>
                    <Typography variant="body1" color="textSecondary">
                      {profile.name}
                    </Typography>
                  </Grid>
                </Grid>
                <Grid item container direction="column" spacing={1}>
                  <Grid item>
                    <Typography variant="h6">Email</Typography>
                  </Grid>
                  <Grid item>
                    <Typography variant="body1" color="textSecondary">
                      {profile.email}
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>
              <Grid item container direction="column" spacing={2}>
                <Grid item>
                  <Typography variant="h2">{PROFILE_MY_COURSES}</Typography>
                </Grid>
                {profile.purchases.length > 0 && <Grid item>Hi</Grid>}
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
            </Grid>
          )}
          {!profile.email && (
            <Typography variant="body1" className={classes.leftMargin}>
              <Link href="/login?redirect=/profile">
                <a>{LOGIN_SECTION_BUTTON}</a>
              </Link>{" "}
              {PROFILE_PAGE_MESSAGE_NOT_LOGGED_IN}
            </Typography>
          )}
        </Grid>
      </Grid>
    </BaseLayout>
  );
}

const mapStateToProps = (state) => ({
  profile: state.profile,
});

export default connect(mapStateToProps)(Profile);
