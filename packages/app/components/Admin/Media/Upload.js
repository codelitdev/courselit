import React, { useState, createRef } from "react";
import PropTypes from "prop-types";
import { Button, TextField } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import { connect } from "react-redux";
import { Section } from "@courselit/components-library";
import {
  BUTTON_ADD_FILE,
  MEDIA_UPLOAD_BUTTON_TEXT,
  MEDIA_UPLOADING,
  FILE_UPLOAD_SUCCESS,
} from "../../../config/strings";
import { addressProps, authProps } from "../../../types";
import fetch from "isomorphic-unfetch";
import { setAppMessage } from "../../../redux/actions";
import AppMessage from "../../../models/app-message";

const useStyles = makeStyles({
  fileUploadInput: {
    display: "none",
  },
});

function Upload({ auth, address, dispatch, resetOverview }) {
  const defaultUploadData = {
    title: "",
    altText: "",
    uploading: false,
  };
  const [uploadData, setUploadData] = useState(defaultUploadData);
  const fileInput = createRef();
  const [uploading, setUploading] = useState(false);
  const classes = useStyles();

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

      let res = await fetch(`${address.backend}/media`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
        body: fD,
      });
      res = await res.json();

      if (res.media) {
        setUploadData(defaultUploadData);
        dispatch(setAppMessage(new AppMessage(FILE_UPLOAD_SUCCESS)));
        await resetOverview();
      } else {
        dispatch(setAppMessage(new AppMessage(res.message)));
      }
    } catch (err) {
      dispatch(setAppMessage(new AppMessage(e.message)));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Section>
      <form onSubmit={onUpload}>
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
        <Button type="submit" disabled={uploading}>
          {uploading ? MEDIA_UPLOADING : MEDIA_UPLOAD_BUTTON_TEXT}
        </Button>
      </form>
    </Section>
  );
}

Upload.propTypes = {
  address: addressProps,
  auth: authProps,
  dispatch: PropTypes.func.isRequired,
  resetOverview: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  address: state.address,
  auth: state.auth,
});

const mapDispatchToProps = (dispatch) => ({
  dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(Upload);
