import React, { useState } from "react";
import PropTypes from "prop-types";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  Button,
  ListItemText,
} from "@material-ui/core";
import {
  DIALOG_SELECT_BUTTON,
  BUTTON_CANCEL_TEXT,
} from "../../../config/strings";
import CompatibleComponentsMap from "./CompatibleComponentsMap";

const AddComponentDialog = (props) => {
  const { onClose, onOpen, showComponentsCompatibleWith } = props;
  const [selectedComponentName, setSelectedComponentName] = useState("");

  const handleSelection = () => {
    onClose(props.showComponentsCompatibleWith, selectedComponentName);
    setSelectedComponentName("");
  };

  const closeDialog = () => {
    setSelectedComponentName("");
    onClose("");
  };

  return (
    <Dialog onClose={closeDialog} open={onOpen}>
      <DialogTitle>{props.title}</DialogTitle>
      <DialogContent>
        <List>
          {CompatibleComponentsMap[showComponentsCompatibleWith] &&
            CompatibleComponentsMap[showComponentsCompatibleWith].map(
              (item, index) => (
                <ListItem
                  key={index}
                  onClick={() => {
                    setSelectedComponentName(item[0]);
                  }}
                  button
                >
                  <ListItemText primary={item[1]} />
                </ListItem>
              )
            )}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={closeDialog}>{BUTTON_CANCEL_TEXT}</Button>
        <Button onClick={handleSelection} disabled={!selectedComponentName}>
          {DIALOG_SELECT_BUTTON}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

AddComponentDialog.propTypes = {
  onOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  showComponentsCompatibleWith: PropTypes.string.isRequired,
};

export default AddComponentDialog;
