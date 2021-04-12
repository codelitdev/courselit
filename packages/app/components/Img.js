import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { addressProps } from "../types.js";

const Img = (props) => {
  const { src, classes, alt, defaultImage } = props;

  const source = src || defaultImage || "/courselit_backdrop.webp";

  return (
    <>
      <img className={classes} src={source} alt={alt} />
      <style jsx>
        {`
          img {
            object-fit: "cover";
            width: 100%;
            height: 100%;
          }
        `}
      </style>
    </>
  );
};

Img.propTypes = {
  src: PropTypes.string,
  isThumbnail: PropTypes.bool,
  classes: PropTypes.string,
  alt: PropTypes.string,
  defaultImage: PropTypes.string,
  address: addressProps,
  isExternal: PropTypes.bool,
};

const mapStateToProps = (state) => ({
  address: state.address,
});

export default connect(mapStateToProps)(Img);
