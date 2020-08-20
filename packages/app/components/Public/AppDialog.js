import React from "react";
import PropTypes from "prop-types";
import { Dialog, DialogTitle, DialogActions, Button } from "@material-ui/core";

const AppDialog = (props) => {
  const { onClose, onOpen } = props;
  const dialogActions = [];

  if (props.actions) {
    for (const action of props.actions) {
      dialogActions.push(
        <Button onClick={action.callback} key={action.name}>
          {action.name}
        </Button>
      );
    }
  }

  return (
    <Dialog onClose={onClose} open={onOpen}>
      <DialogTitle>{props.title}</DialogTitle>
      {props.children}
      {props.actions && <DialogActions>{dialogActions}</DialogActions>}
    </Dialog>
  );
};

AppDialog.propTypes = {
  onOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  children: PropTypes.object,
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      callback: PropTypes.func.isRequired,
    })
  ),
};

export default AppDialog;
