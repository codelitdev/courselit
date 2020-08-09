import React from "react";
import PropTypes from "prop-types";

const Text = (props) => {
  return <span style={props.style}>{props.children}</span>;
};

Text.propTypes = {
  style: PropTypes.object.isRequired,
  children: PropTypes.array,
};

export default Text;
