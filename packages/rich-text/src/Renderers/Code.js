import React from "react";
import PropTypes from "prop-types";

const Code = (props) => {
  return <div style={props.style}>{props.children}</div>;
};

Code.propTypes = {
  style: PropTypes.object.isRequired,
  children: PropTypes.array,
};

export default Code;
