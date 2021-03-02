/**
 * A component to render a list of items which in turn have their own
 * settings.
 */

import React, { useState } from "react";
import PropTypes from "prop-types";
import { Grid, IconButton, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import { ArrowBack } from "@material-ui/icons";
import dynamic from "next/dynamic";
const Master = dynamic(() => import("./Master"));

const useStyles = makeStyles((theme) => ({
  main: {
    marginTop: theme.spacing(2),
  },
}));

const OverviewAndDetail = ({ title, componentsMap }) => {
  const [selectedComponentIndex, setSelectedComponentIndex] = useState(-1);
  const classes = useStyles();

  return (
    <Grid container direction="column">
      <Grid item xs={12}>
        {selectedComponentIndex > -1 && (
          <Grid item xs>
            <Grid container alignItems="center">
              <Grid item>
                <IconButton onClick={() => setSelectedComponentIndex(-1)}>
                  <ArrowBack />
                </IconButton>
              </Grid>
              <Grid item>
                <Typography variant="h3">
                  {componentsMap[selectedComponentIndex].subtitle}
                </Typography>
              </Grid>
            </Grid>
          </Grid>
        )}
        {selectedComponentIndex === -1 && (
          <Typography variant="h1">{title}</Typography>
        )}
      </Grid>
      <Grid item className={classes.main} xs={12}>
        {componentsMap.length && (
          <>
            {selectedComponentIndex > -1 &&
              componentsMap[selectedComponentIndex].Detail}
            {selectedComponentIndex === -1 && (
              <Master
                componentsMap={componentsMap}
                onSelect={(name) => setSelectedComponentIndex(name)}
              />
            )}
          </>
        )}
      </Grid>
    </Grid>
  );
};

OverviewAndDetail.propTypes = {
  title: PropTypes.string.isRequired,
  componentsMap: PropTypes.arrayOf(
    PropTypes.shape({
      subtitle: PropTypes.string.isRequired,
      Overview: PropTypes.object.isRequired,
      Detail: PropTypes.object.isRequired,
    })
  ),
};

export default OverviewAndDetail;
