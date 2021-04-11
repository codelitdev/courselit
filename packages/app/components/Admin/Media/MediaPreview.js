import React from "react";
import { makeStyles } from "@material-ui/styles";
import { Grid, Typography } from "@material-ui/core";
import {
  HEADER_MEDIA_PREVIEW,
  MEDIA_EDITOR_ORIGINAL_FILE_NAME_HEADER,
  PREVIEW_PDF_FILE,
} from "../../../config/strings";
import { connect } from "react-redux";
import { mediaProps } from "../../../types";
import dynamic from "next/dynamic";
import { Section } from "@courselit/components-library";

const Img = dynamic(() => import("../../Img.js"));

const useStyles = makeStyles({
  video: {
    minWidth: 200,
    maxWidth: "100%",
    height: "auto",
  },
  img: {
    maxHeight: 200,
  },
  link: {
    wordBreak: "break-all",
  },
});

const MediaPreview = (props) => {
  const { item } = props;
  const { file, originalFileName, mimeType, altText } = item;
  const classes = useStyles();

  return (
    <Section>
      <Grid container direction="column" spacing={1}>
        {[
          "application/pdf",
          "image/png",
          "image/jpeg",
          "image/webp",
          "video/mp4",
          "audio/mp3",
        ].includes(mimeType) && (
          <Grid item>
            <Typography variant="h4">{HEADER_MEDIA_PREVIEW}</Typography>
          </Grid>
        )}
        <Grid item>
          <Typography variant="body1">
            {MEDIA_EDITOR_ORIGINAL_FILE_NAME_HEADER}: {originalFileName}
          </Typography>
        </Grid>
        <Grid item>
          <Typography variant="body1">
            Direct URL:{" "}
            <a
              href={file}
              target="_blank"
              rel="noopener noreferrer"
              className={classes.link}
            >
              {file}
            </a>
          </Typography>
        </Grid>
        <Grid item>
          {(mimeType === "image/png" ||
            mimeType === "image/jpeg" ||
            mimeType === "image/webp") && (
            <div className={classes.img}>
              <Img src={file} alt={altText} />
            </div>
          )}
          {mimeType === "video/mp4" && (
            <video controls controlsList="nodownload" className={classes.video}>
              <source src={file} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          )}
          {mimeType === "audio/mp3" && (
            <audio controls controlsList="nodownload">
              <source src={file} type="audio/mpeg" />
              Your browser does not support the video tag.
            </audio>
          )}
        </Grid>
        {mimeType === "application/pdf" && (
          <Grid item>
            <a href={file} target="_blank" rel="noopener noreferrer">
              {PREVIEW_PDF_FILE}
            </a>
          </Grid>
        )}
      </Grid>
    </Section>
  );
};

MediaPreview.propTypes = {
  item: mediaProps,
};

const mapStateToProps = (state) => ({
  address: state.address,
});

export default connect(mapStateToProps)(MediaPreview);
