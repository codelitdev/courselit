import React from "react";
import PropTypes from "prop-types";
import { Typography, Grid } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import { USER_ERROR_HEADER } from "../config/strings";
import { Section } from "@courselit/components-library";
import BaseLayout from "./Public/BaseLayout";

const useStyles = makeStyles((theme) => ({
  header: {
    marginBottom: theme.spacing(1),
  },
}));

const AppError = (props) => {
  const { error } = props;
  const classes = useStyles();

  return (
    <BaseLayout>
      <Grid container>
        <Grid item>
          <Section>
            <Typography
              variant="body1"
              color="textSecondary"
              className={classes.header}
            >
              {USER_ERROR_HEADER}
            </Typography>
            <Typography variant="h5">{error}</Typography>
          </Section>
        </Grid>
      </Grid>
    </BaseLayout>
  );
};

AppError.propTypes = {
  error: PropTypes.string.isRequired,
};

export default AppError;
