import React, { useState } from "react";
import PropTypes from "prop-types";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@material-ui/core";
import MediaGallery from "./MediaGallery.js";
import {
  BUTTON_CANCEL_TEXT,
  DIALOG_SELECT_BUTTON,
} from "../../../config/strings.js";

const MediaManagerDialog = (props) => {
  const { onClose, onOpen } = props;
  const [selectedMediaId, setSelectedMediaId] = useState("");

  const handleSelection = () => onClose(selectedMediaId);

  return (
    <Dialog onClose={onClose} open={onOpen}>
      <DialogTitle>{props.title}</DialogTitle>
      <DialogContent>
        <MediaGallery
          onMediaSelected={(mediaId) => setSelectedMediaId(mediaId)}
          mimeTypesToShow={props.mimeTypesToShow}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{BUTTON_CANCEL_TEXT}</Button>
        <Button onClick={handleSelection} disabled={!selectedMediaId}>
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
