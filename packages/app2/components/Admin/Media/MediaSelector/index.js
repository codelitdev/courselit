import React, { useState } from "react";
import { styled } from '@mui/material/styles';
import PropTypes from "prop-types";
import {
  BUTTON_SELECT_MEDIA,
  DIALOG_TITLE_FEATURED_IMAGE,
} from "../../../../config/strings";
import { Grid, Button, Typography } from "@mui/material";
import dynamic from "next/dynamic";

const PREFIX = 'MediaSelector';

const classes = {
  preview: `${PREFIX}-preview`
};

const StyledGrid = styled(Grid)((
  {
    theme
  }
) => ({
  [`& .${classes.preview}`]: {
    width: 100,
  }
}));

const Img = dynamic(() => import("../../../Img.js"));
const MediaManagerDialog = dynamic(() => import("./MediaManagerDialog.js"));

const MediaSelector = (props) => {
  const [dialogOpened, setDialogOpened] = useState(false);


  const onSelection = (media) => {
    setDialogOpened(!dialogOpened);
    props.onSelection(media);
  };

  return (
    <StyledGrid container direction="row" alignItems="center" spacing={2}>
      <Grid item>
        <Typography variant="body1">{props.title}</Typography>
      </Grid>
      <Grid item className={classes.preview}>
        <Img src={props.src} />
      </Grid>
      <Grid item>
        <Button
          variant="outlined"
          onClick={() => setDialogOpened(!dialogOpened)}
        >
          {BUTTON_SELECT_MEDIA}
        </Button>
      </Grid>
      <MediaManagerDialog
        onOpen={dialogOpened}
        onClose={onSelection}
        title={DIALOG_TITLE_FEATURED_IMAGE}
        mediaAdditionAllowed={false}
        mimeTypesToShow={props.mimeTypesToShow}
        public={props.public}
      />
    </StyledGrid>
  );
};

MediaSelector.propTypes = {
  title: PropTypes.string,
  src: PropTypes.string,
  onSelection: PropTypes.func.isRequired,
  mimeTypesToShow: PropTypes.arrayOf(PropTypes.string),
  public: PropTypes.string,
};

export default MediaSelector;
