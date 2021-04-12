import React, { useState } from "react";
import PropTypes from "prop-types";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@material-ui/core";
import MediaGallery from "../index";
import {
  BUTTON_CANCEL_TEXT,
  DIALOG_SELECT_BUTTON,
} from "../../../../config/strings";

const MediaManagerDialog = (props) => {
  const { onClose, onOpen, mimeTypesToShow } = props;
  const [selectedMedia, setSelectedMedia] = useState({});

  const handleSelection = () => onClose(selectedMedia);

  return (
    <Dialog onClose={onClose} open={onOpen}>
      <DialogTitle>{props.title}</DialogTitle>
      <DialogContent>
        <MediaGallery
          selectionMode={true}
          onSelect={(media) => setSelectedMedia(media)}
          mimeTypesToShow={mimeTypesToShow}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose()}>{BUTTON_CANCEL_TEXT}</Button>
        <Button onClick={handleSelection} disabled={!selectedMedia}>
          {DIALOG_SELECT_BUTTON}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

MediaManagerDialog.propTypes = {
  onOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  mediaAdditionAllowed: PropTypes.bool,
  mimeTypesToShow: PropTypes.arrayOf(PropTypes.string),
};

export default MediaManagerDialog;
