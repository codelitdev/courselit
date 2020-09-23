import React from "react";
import PropTypes from "prop-types";
import { makeStyles } from "@material-ui/styles";

const useStyles = makeStyles((theme) => ({
  card: {
    padding: theme.spacing(2),
    border: "1px solid transparent",
    borderRadius: 1,
    "&:hover": {
      border: "1px solid #cccccc",
      cursor: "pointer",
    },
  },
}));

const Card = (props) => {
  const classes = useStyles();

  return <div className={classes.card}>{props.children}</div>;
};

Card.propTypes = {
  children: PropTypes.object,
};

export default Card;
