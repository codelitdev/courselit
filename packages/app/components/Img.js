import React from "react";
import PropTypes from "prop-types";
import { MEDIA_BACKEND } from "../config/constants.js";
import { formulateMediaUrl } from "../lib/utils.js";

const Img = (props) => {
  const { src, isThumbnail, classes, alt, defaultImage } = props;

  return (
    <>
      <img
        className={classes}
        src={
          src
            ? `${formulateMediaUrl(MEDIA_BACKEND, src, isThumbnail)}`
            : defaultImage || "/courselit_backdrop.webp"
        }
        alt={alt}
      />
      <style jsx>{`
        img {
          width: 100%;
          height: auto;
        }
      `}</style>
    </>
  );
};

Img.propTypes = {
  src: PropTypes.string,
  isThumbnail: PropTypes.bool,
  classes: PropTypes.string,
  alt: PropTypes.string,
  defaultImage: PropTypes.string,
};

export default Img;
