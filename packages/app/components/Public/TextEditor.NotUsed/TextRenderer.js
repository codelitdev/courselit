import React from "react";
import PropTypes from "prop-types";
import { Typography } from "@material-ui/core";

const TextRenderer = (props) => {
  return (
    <Typography component={"span"} variant="body1">
      {props.children}
    </Typography>
  );
};

TextRenderer.propTypes = {
  children: PropTypes.array,
};

export default TextRenderer;
