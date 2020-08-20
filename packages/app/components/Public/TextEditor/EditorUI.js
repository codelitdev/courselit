import React, { useState } from "react";
import Editor from "./Editor.js";
import PropTypes from "prop-types";
import { BACKEND, MIMETYPE_IMAGE } from "../../../config/constants.js";

import {
  IconButton,
  Dialog,
  AppBar,
  Toolbar,
  Slide,
  Grid,
  Menu,
  MenuItem,
} from "@material-ui/core";
import { Edit, TextFormat, InsertPhoto, Done } from "@material-ui/icons";
import { makeStyles } from "@material-ui/styles";
import { MEDIA_MANAGER_DIALOG_TITLE } from "../../../config/strings.js";
import MediaManagerDialog from "../../Admin/Media/MediaManagerDialog.js";

const useStyles = makeStyles((theme) => ({
  editorContainer: {
    margin: theme.spacing(2),
    marginBottom: theme.spacing(16),
  },
  appBar: {
    top: "auto",
    bottom: 0,
  },
}));

const stylingForInternalComponentsOfDraftJS = {
  media: {
    container: {
      display: "flex",
      justifyContent: "center",
    },
    img: {
      maxWidth: "100%",
    },
  },
  code: {
    background: "rgb(45, 45, 45)",
    color: "#e2e7ff",
    padding: "10px 16px",
    borderRadius: 2,
    fontFamily: '"Fira Code", monospace',
  },
  blockquote: {
    fontStyle: "italic",
    marginTop: 10,
    marginBottom: 10,
    borderLeft: "5px solid #cecece",
    paddingLeft: 10,
    fontSize: "1.6em",
    color: "#686868",
  },
};

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const EditorUI = (props) => {
  const [open, setOpen] = useState(false);
  const [addImageDialogOpened, setAddImageDialogOpened] = useState(false);
  const [insertAnchorEl, setinsertAnchorEl] = useState(null);
  const [formatAnchorEl, setFormatAnchorEl] = useState(null);
  const classes = useStyles();

  const onChange = (editorState) => {
    props.onChange(editorState);
  };

  const handleMediaManagerClose = (url) => {
    setAddImageDialogOpened(false);
    // TODO: Add capability to add other media types like videos, pdfs etc.
    props.onChange(
      Editor.addImage(props.editorState, `${BACKEND}/media/${url}`)
    );
  };

  const highlightCode = () => {
    handleFormatClose();
    props.onChange(Editor.toggleCode(props.editorState));
  };

  const toggleBlockquote = () => {
    handleFormatClose();
    props.onChange(Editor.toggleBlockquote(props.editorState));
  };

  const openMediaSelection = () => {
    handleInsertClose();
    setAddImageDialogOpened(true);
  };

  const closeEditor = () => setOpen(false);

  const handleInsertOpen = (event) => setinsertAnchorEl(event.currentTarget);
  const handleInsertClose = () => setinsertAnchorEl(null);

  const handleFormatOpen = (event) => setFormatAnchorEl(event.currentTarget);
  const handleFormatClose = () => setFormatAnchorEl(null);

  const editor = (
    <Editor
      editorState={props.editorState}
      onChange={onChange}
      readOnly={props.readOnly}
      theme={stylingForInternalComponentsOfDraftJS}
    />
  );

  return props.readOnly ? (
    editor
  ) : (
    <>
      <IconButton onClick={() => setOpen(true)}>
        <Edit />
      </IconButton>
      <Dialog
        fullScreen
        open={open}
        onClose={closeEditor}
        TransitionComponent={Transition}
      >
        <AppBar position="fixed" className={classes.appBar}>
          <Toolbar>
            <Grid container justify="space-between" alignItems="center">
              <div>
                <IconButton
                  color="inherit"
                  onClick={handleInsertOpen}
                  aria-controls="insert-menu"
                >
                  <InsertPhoto />
                </IconButton>
                <IconButton
                  color="inherit"
                  onClick={handleFormatOpen}
                  aria-controls="format-menu"
                >
                  <TextFormat />
                </IconButton>
                <Menu
                  id="insert-menu"
                  anchorEl={insertAnchorEl}
                  keepMounted
                  open={Boolean(insertAnchorEl)}
                  onClose={handleInsertClose}
                >
                  <MenuItem onClick={openMediaSelection}>Media</MenuItem>
                </Menu>
                <Menu
                  id="format-menu"
                  anchorEl={formatAnchorEl}
                  keepMounted
                  open={Boolean(formatAnchorEl)}
                  onClose={handleFormatClose}
                >
                  <MenuItem onClick={highlightCode}>Code</MenuItem>
                  <MenuItem onClick={toggleBlockquote}>Blockquote</MenuItem>
                </Menu>
              </div>
              <IconButton edge="end" color="inherit" onClick={closeEditor}>
                <Done />
              </IconButton>
            </Grid>
          </Toolbar>
        </AppBar>
        <div className={classes.editorContainer}>
          {editor}
          <div className={classes.offset}></div>
        </div>
      </Dialog>
      <MediaManagerDialog
        onOpen={addImageDialogOpened}
        onClose={handleMediaManagerClose}
        title={MEDIA_MANAGER_DIALOG_TITLE}
        mediaAdditionAllowed={false}
        mimeTypesToShow={[...MIMETYPE_IMAGE]}
      />
    </>
  );
};

EditorUI.getDecorators = Editor.getDecorators;

EditorUI.propTypes = {
  editorState: PropTypes.object,
  onChange: PropTypes.func,
  readOnly: PropTypes.bool,
};

export default EditorUI;
