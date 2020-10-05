import React from "react";
import { CircularProgress, Grid, Typography } from "@material-ui/core";
import { LOADING } from "../config/strings";
import { makeStyles } from "@material-ui/styles";

const useStyles = makeStyles({
  loader: {
    // height: '100%',
    // width: '100%'
  },
});

const AppLoader = (props) => {
  const classes = useStyles();

  return (
    <Grid
      container
      direction="column"
      justify="center"
      alignItems="center"
      className={classes.loader}
    >
      <Grid item>
        <CircularProgress />
      </Grid>
      <Grid item>
        <Typography variant="subtitle1">{LOADING}</Typography>
      </Grid>
    </Grid>
  );
};

export default AppLoader;
