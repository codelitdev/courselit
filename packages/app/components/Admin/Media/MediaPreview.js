import React from "react";
import PropTypes from "prop-types";
import { formulateMediaUrl } from "../../../lib/utils";
import { MEDIA_BACKEND } from "../../../config/constants.js";
import { makeStyles } from "@material-ui/styles";
import { Typography } from "@material-ui/core";
import {
  HEADER_MEDIA_PREVIEW,
  PREVIEW_PDF_FILE,
} from "../../../config/strings";
import Img from "../../Img";

const useStyles = makeStyles({
  video: {
    width: 300,
    height: "auto",
  },
  img: {
    width: '60%',
    height: "auto",
  },
});

const MediaPreview = (props) => {
  const { mimeType, id } = props;
  const classes = useStyles();

  return (
    <>
      {[
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/webp",
        "video/mp4",
        "audio/mp3"
      ].includes(mimeType) && (
        <Typography variant="subtitle1">{HEADER_MEDIA_PREVIEW}</Typography>
      )}
      {mimeType === "application/pdf" && (
        <a
          href={`${formulateMediaUrl(MEDIA_BACKEND, id, false)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {PREVIEW_PDF_FILE}
        </a>
      )}
      {(mimeType === "image/png" || mimeType === "image/jpeg" || mimeType === "image/webp") &&
        <div className={classes.img}>
          <Img src={id} />
        </div>
      }
      {mimeType === "video/mp4" && (
        <video controls controlsList="nodownload" className={classes.video}>
          <source
            src={`${formulateMediaUrl(MEDIA_BACKEND, id, false)}`}
            type="video/mp4"
          />
          Your browser does not support the video tag.
        </video>
      )}
      {mimeType === "audio/mp3" && (
        <audio controls controlsList="nodownload">
          <source
            src={`${formulateMediaUrl(MEDIA_BACKEND, id, false)}`}
            type="audio/mpeg"
          />
          Your browser does not support the video tag.
        </audio>
      )}
      <Typography variant="body1">
        Direct URL:{" "}
        <a href={formulateMediaUrl(MEDIA_BACKEND, id, false)}>
          {formulateMediaUrl(MEDIA_BACKEND, id, false)}
        </a>
      </Typography>
    </>
  );
};

MediaPreview.propTypes = {
  id: PropTypes.string,
  mimeType: PropTypes.string,
};

export default MediaPreview;
