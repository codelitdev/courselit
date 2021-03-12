import React, { useState, createRef } from "react";
import { connect } from "react-redux";
import fetch from "isomorphic-unfetch";
import PropTypes from "prop-types";
import {
  MEDIA_UPLOAD_BUTTON_TEXT,
  MEDIA_MANAGER_PAGE_HEADING,
  MEDIA_MANAGER_DIALOG_TITLE,
  BUTTON_ADD_FILE,
  FILE_UPLOAD_SUCCESS,
  MEDIA_UPLOADING,
} from "../../../config/strings.js";
import { addressProps, authProps } from "../../../types.js";
import { setAppMessage } from "../../../redux/actions.js";
import {
  TextField,
  Button,
  Grid,
  Typography,
  CardActions,
  Card,
  CardContent,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import { Add, Done } from "@material-ui/icons";
import AppMessage from "../../../models/app-message.js";

import MediaGallery from "./MediaGallery.js";

const useStyles = makeStyles((theme) => ({
  header: {
    marginBottom: theme.spacing(1),
  },
  fileUploadInput: {
    display: "none",
  },
}));

const MediaManager = (props) => {
  const defaults = {
    uploadData: {
      title: "",
      altText: "",
      uploading: false,
    },
    uploadFormVisibility:
      typeof props.mediaAdditionAllowed !== "undefined"
        ? props.mediaAdditionAllowed
        : true,
    selectedMedia: null,
  };
  const [uploadData, setUploadData] = useState(defaults.uploadData);
  const fileInput = createRef();
  const classes = useStyles();
  const [uploadFormVisible, setUploadFormVisible] = useState(false);
  const [uploading, setUploading] = useState(false);

  const onUploadDataChanged = (e) =>
    setUploadData(
      Object.assign({}, uploadData, {
        [e.target.name]: e.target.value,
      })
    );

  const onUpload = async (e) => {
    e.preventDefault();

    const fD = new window.FormData();
    fD.append("title", uploadData.title);
    fD.append("altText", uploadData.altText);
    fD.append("file", fileInput.current.files[0]);

    setUploadData(
      Object.assign({}, uploadData, {
        uploading: true,
      })
    );

    try {
      setUploading(true);

      let res = await fetch(`${props.address.backend}/media`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${props.auth.token}`,
        },
        body: fD,
      });
      res = await res.json();

      if (res.media) {
        setUploadData(defaults.uploadData);
        props.dispatch(setAppMessage(new AppMessage(FILE_UPLOAD_SUCCESS)));
        setUploadFormVisible(false);
      } else {
        props.dispatch(setAppMessage(new AppMessage(res.message)));
      }
    } catch (err) {
      props.dispatch(setAppMessage(new AppMessage(e.message)));
    } finally {
      setUploading(false);
    }
  };

  const showUploadForm = () => {
    setUploadFormVisible(!uploadFormVisible);
  };

  return (
    <>
      <Grid container direction="column">
        <Grid item container justify="space-between" alignItems="center">
          <Grid item className={classes.header}>
            <Typography variant="h1">{MEDIA_MANAGER_PAGE_HEADING}</Typography>
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              color={uploadFormVisible ? "secondary" : "primary"}
              className={classes.fab}
              onClick={showUploadForm}
            >
              {uploadFormVisible ? <Done /> : <Add />}
            </Button>
          </Grid>
        </Grid>
        {uploadFormVisible && (
          <Card>
            <form onSubmit={onUpload}>
              <CardContent>
                <Typography variant="h6" className={classes.cardHeader}>
                  {MEDIA_MANAGER_DIALOG_TITLE}
                </Typography>
                <Button variant="contained" component="label" color="primary">
                  {BUTTON_ADD_FILE}
                  <input
                    type="file"
                    name="file"
                    ref={fileInput}
                    className={classes.fileUploadInput}
                  />
                </Button>
                <TextField
                  required
                  variant="outlined"
                  label="Title"
                  fullWidth
                  margin="normal"
                  name="title"
                  value={uploadData.title}
                  onChange={onUploadDataChanged}
                />
                <TextField
                  required
                  variant="outlined"
                  label="Alt text"
                  fullWidth
                  margin="normal"
                  name="altText"
                  value={uploadData.altText}
                  onChange={onUploadDataChanged}
                />
              </CardContent>
              <CardActions>
                <Button type="submit" disabled={uploading}>
                  {uploading ? MEDIA_UPLOADING : MEDIA_UPLOAD_BUTTON_TEXT}
                </Button>
              </CardActions>
            </form>
          </Card>
        )}
        {!uploadFormVisible && <MediaGallery />}
      </Grid>
    </>
  );
};

MediaManager.propTypes = {
  auth: authProps,
  dispatch: PropTypes.func.isRequired,
  onMediaSelected: PropTypes.func.isRequired,
  mediaAdditionAllowed: PropTypes.bool,
  networkAction: PropTypes.bool.isRequired,
  address: addressProps,
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  networkAction: state.networkAction,
  address: state.address,
});

const mapDispatchToProps = (dispatch) => ({
  dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(MediaManager);
