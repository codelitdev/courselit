import React from "react";
import PropTypes from "prop-types";
import { Container } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";

const useStyles = makeStyles({
  root: {
    marginTop: 10,
  },
});

const ContainedBodyLayout = (props) => {
  const classes = useStyles();

  return (
    <Container maxWidth="xl" className={classes.root}>
      {props.children}
    </Container>
  );
};

ContainedBodyLayout.propTypes = {
  children: PropTypes.any,
};

export default ContainedBodyLayout;
