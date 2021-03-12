import React from "react";
import PropTypes from "prop-types";
import { formulateMediaUrl } from "../../../lib/utils";
import { makeStyles } from "@material-ui/styles";
import { Typography } from "@material-ui/core";
import {
  HEADER_MEDIA_PREVIEW,
  PREVIEW_PDF_FILE,
} from "../../../config/strings";
import Img from "../../Img";
import { connect } from "react-redux";
import { addressProps } from "../../../types";

const useStyles = makeStyles({
  video: {
    width: 300,
    height: "auto",
  },
  img: {
    width: "60%",
    height: "auto",
  },
});

const MediaPreview = (props) => {
  const { mimeType, id, address } = props;
  const classes = useStyles();

  return (
    <>
      {[
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/webp",
        "video/mp4",
        "audio/mp3",
      ].includes(mimeType) && (
        <Typography variant="subtitle1">{HEADER_MEDIA_PREVIEW}</Typography>
      )}
      {mimeType === "application/pdf" && (
        <a
          href={`${formulateMediaUrl(address.backend, id, false)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {PREVIEW_PDF_FILE}
        </a>
      )}
      {(mimeType === "image/png" ||
        mimeType === "image/jpeg" ||
        mimeType === "image/webp") && (
        <div className={classes.img}>
          <Img src={id} />
        </div>
      )}
      {mimeType === "video/mp4" && (
        <video controls controlsList="nodownload" className={classes.video}>
          <source
            src={`${formulateMediaUrl(address.backend, id, false)}`}
            type="video/mp4"
          />
          Your browser does not support the video tag.
        </video>
      )}
      {mimeType === "audio/mp3" && (
        <audio controls controlsList="nodownload">
          <source
            src={`${formulateMediaUrl(address.backend, id, false)}`}
            type="audio/mpeg"
          />
          Your browser does not support the video tag.
        </audio>
      )}
      <Typography variant="body1">
        Direct URL:{" "}
        <a href={formulateMediaUrl(address.backend, id, false)}>
          {formulateMediaUrl(address.backend, id, false)}
        </a>
      </Typography>
    </>
  );
};

MediaPreview.propTypes = {
  id: PropTypes.string,
  mimeType: PropTypes.string,
  address: addressProps,
};

const mapStateToProps = (state) => ({
  address: state.address,
});

export default connect(mapStateToProps)(MediaPreview);
