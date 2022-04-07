import React from "react";
import { styled } from "@mui/material/styles";
import PropTypes from "prop-types";
import { Container } from "@mui/material";
const PREFIX = "ContainedBodyLayout";

const classes = {
  root: `${PREFIX}-root`,
};

const StyledContainer = styled(Container)({
  [`&.${classes.root}`]: {
    marginTop: 10,
  },
});

const ContainedBodyLayout = (props) => {
  return (
    <StyledContainer maxWidth="xl" className={classes.root}>
      {props.children}
    </StyledContainer>
  );
};

ContainedBodyLayout.propTypes = {
  children: PropTypes.any,
};

export default ContainedBodyLayout;
