import * as React from "react";
import { makeStyles } from "@material-ui/styles";

const useStyles = makeStyles((theme: any) => ({
  card: Object.assign(
    {},
    {
      backgroundColor: theme.palette.background.paper,
      padding: theme.spacing(2),
      borderRadius: theme.spacing(1),
      boxShadow: theme.shadows[12],
    },
    theme.section
  ),
}));

interface SectionProps {
  children: any;
}

const Section = (props: SectionProps) => {
  const classes = useStyles();
  return <section className={classes.card}>{props.children}</section>;
};

export default Section;
