import React from "react";
import { makeStyles } from "@material-ui/styles";

const useStyles = makeStyles(theme => ({
  card: {
    [theme.breakpoints.up("md")]: {
      padding: theme.spacing(2)
    },
    border: "1px solid transparent",
    borderRadius: 1,
    "&:hover": {
      border: "1px solid #cccccc"
    },
  }
}));

const Card = props => {
  const classes = useStyles();

  return <div className={classes.card}>{props.children}</div>;
};

export default Card;
