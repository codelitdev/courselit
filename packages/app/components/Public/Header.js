import React from "react";
import PropTypes from "prop-types";
import { Typography } from "@material-ui/core";

const Header = (props) => {
  const headerSize = props.headerSize || "h4";

  return <Typography variant={headerSize}>{props.text}</Typography>;
};

Header.propTypes = {
  text: PropTypes.string.isRequired,
  headerSize: PropTypes.string,
};

export default Header;
