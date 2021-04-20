import React, { useState } from "react";
import PropTypes from "prop-types";
import {
  BUTTON_SELECT_MEDIA,
  DIALOG_TITLE_FEATURED_IMAGE,
} from "../../../../config/strings";
import { Grid, Button, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import dynamic from "next/dynamic";
import { constructThumbnailUrlFromFileUrl } from "../../../../lib/utils";

const Img = dynamic(() => import("../../../Img.js"));
const MediaManagerDialog = dynamic(() => import("./MediaManagerDialog.js"));

const useStyles = makeStyles((theme) => ({
  preview: {
    width: 100,
  },
}));

const MediaSelector = (props) => {
  const [dialogOpened, setDialogOpened] = useState(false);
  const classes = useStyles();

  const onSelection = (media) => {
    setDialogOpened(!dialogOpened);
    props.onSelection(media);
  };

  return (
    <Grid container direction="row" alignItems="center" spacing={2}>
      <Grid item>
        <Typography variant="body1">{props.title}</Typography>
      </Grid>
      <Grid item className={classes.preview}>
        <Img src={constructThumbnailUrlFromFileUrl(props.src)} />
      </Grid>
      <Grid item>
        <Button onClick={() => setDialogOpened(!dialogOpened)}>
          {BUTTON_SELECT_MEDIA}
        </Button>
      </Grid>
      <MediaManagerDialog
        onOpen={dialogOpened}
        onClose={onSelection}
        title={DIALOG_TITLE_FEATURED_IMAGE}
        mediaAdditionAllowed={false}
        mimeTypesToShow={props.mimeTypesToShow}
      />
    </Grid>
  );
};

MediaSelector.propTypes = {
  title: PropTypes.string,
  src: PropTypes.string,
  onSelection: PropTypes.func.isRequired,
  mimeTypesToShow: PropTypes.arrayOf(PropTypes.string),
};

export default MediaSelector;
