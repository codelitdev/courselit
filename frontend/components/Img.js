import React from "react";
import PropTypes from "prop-types";
import { MEDIA_BACKEND } from "../config/constants.js";
import { formulateMediaUrl } from "../lib/utils.js";

const Img = props => {
  const { src, isThumbnail, classes } = props;

  return (
    <>
      {src && (
        <>
          <img
            className={classes}
            src={
              src
                ? `${formulateMediaUrl(MEDIA_BACKEND, src, isThumbnail)}`
                : "/static/default.png"
            }
          />
          <style jsx>{`
            img {
              width: 100%;
              height: auto;
            }
          `}</style>
        </>
      )}
      {!src && <></>}
    </>
  );
};

Img.propTypes = {
  src: PropTypes.string,
  isThumbnail: PropTypes.bool,
  classes: PropTypes.string
};

export default Img;
