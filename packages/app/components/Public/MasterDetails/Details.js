import React from "react";
import PropTypes from "prop-types";
import { Grid, IconButton } from "@material-ui/core";
import { ArrowBack } from "@material-ui/icons";
import { useTheme } from "@material-ui/styles";
import FetchBuilder from "../../../lib/fetch";
import { BACKEND } from "../../../config/constants";

const Details = (props) => {
  const { name, onBackPressed, component: Component } = props;
  const theme = useTheme();
  const fetch = new FetchBuilder()
    .setUrl(`${BACKEND}/graph`)
    .setIsGraphQLEndpoint(true);

  return (
    <Grid container direction="column">
      <Grid item>
        <IconButton onClick={onBackPressed}>
          <ArrowBack />
        </IconButton>
      </Grid>
      <Grid item container direction="column">
        <Component name={name} fetchBuilder={fetch} theme={theme} />
      </Grid>
    </Grid>
  );
};

Details.propTypes = {
  name: PropTypes.string.isRequired,
  onBackPressed: PropTypes.func.isRequired,
  component: PropTypes.object.isRequired,
};

export default Details;
