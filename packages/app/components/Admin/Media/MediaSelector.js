import React, { useState } from "react";
import PropTypes from "prop-types";
import {
  BUTTON_SELECT_MEDIA,
  DIALOG_TITLE_FEATURED_IMAGE,
} from "../../../config/strings.js";
import Img from "../../Img.js";
import MediaManagerDialog from "./MediaManagerDialog.js";
import { Grid, Button, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";

const useStyles = makeStyles((theme) => ({
  control: {
    marginLeft: theme.spacing(1),
    width: "6rem",
  },
}));

const MediaSelector = (props) => {
  const [dialogOpened, setDialogOpened] = useState(false);
  const classes = useStyles();

  const onSelection = (mediaID) => {
    setDialogOpened(!dialogOpened);
    props.onSelection(mediaID);
  };

  return (
    <Grid container direction="row" alignItems="center">
      <Grid item>
        <Typography variant="body1">{props.title}</Typography>
      </Grid>
      <Grid item className={classes.control}>
        <Img src={props.src} isThumbnail={true} />
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
