import React from "react";
import PropTypes from "prop-types";
import { Grid, Typography, IconButton } from "@material-ui/core";
import { Remove } from "@material-ui/icons";
import { makeStyles } from "@material-ui/styles";

const useStyles = makeStyles((theme) => ({
  container: {
    padding: theme.spacing(1),
    border: "1px solid #eee",
  },
}));

const AddedComponent = (props) => {
  const classes = useStyles();

  return (
    <Grid
      container
      item
      direction="row"
      alignItems="center"
      justify="space-between"
      className={classes.container}
    >
      <Grid item>
        <Typography variant="caption">{props.title}</Typography>
      </Grid>
      <Grid item>
        <IconButton
          color="default"
          aria-label="remove component"
          onClick={() => props.removeComponent(props.section, props.index)}
        >
          <Remove />
        </IconButton>
      </Grid>
    </Grid>
  );
};

AddedComponent.propTypes = {
  section: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  removeComponent: PropTypes.func.isRequired,
};

export default AddedComponent;
