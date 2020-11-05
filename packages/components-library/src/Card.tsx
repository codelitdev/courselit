import * as React from "react";
import { makeStyles } from "@material-ui/styles";

const useStyles = makeStyles((theme: any) => ({
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

interface CardProps {
  children: () => {};
}

const Card = (props: CardProps) => {
  const classes = useStyles();

  return <div className={classes.card}>{props.children}</div>;
};

export default Card;
