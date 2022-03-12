import * as React from "react";
import { styled } from '@mui/material/styles';
const PREFIX = 'Section';

const classes = {
  card: `${PREFIX}-card`
};

const Root = styled('section')(({ theme }) => ({
  [`&.${classes.card}`]: Object.assign(
    {},
    {
      backgroundColor: theme.palette.background.paper,
      padding: theme.spacing(2),
      borderRadius: theme.spacing(1),
      boxShadow: theme.shadows[12],
    },
    theme.section
  )
}));

interface SectionProps {
  children: any;
}

const Section = (props: SectionProps) => {

  return <Root className={classes.card}>{props.children}</Root>;
};

export default Section;
