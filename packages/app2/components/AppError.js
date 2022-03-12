import React from "react";
import { styled } from '@mui/material/styles';
import PropTypes from "prop-types";
import { Typography, Grid } from "@mui/material";
import { USER_ERROR_HEADER } from "../config/strings";
import { Section } from "@courselit/components-library";
import BaseLayout from "./Public/BaseLayout";

const PREFIX = 'AppError';

const classes = {
  header: `${PREFIX}-header`
};

const StyledBaseLayout = styled(BaseLayout)((
  {
    theme
  }
) => ({
  [`& .${classes.header}`]: {
    marginBottom: theme.spacing(1),
  }
}));

const AppError = (props) => {
  const { error } = props;


  return (
    <StyledBaseLayout>
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
    </StyledBaseLayout>
  );
};

AppError.propTypes = {
  error: PropTypes.string.isRequired,
};

export default AppError;
