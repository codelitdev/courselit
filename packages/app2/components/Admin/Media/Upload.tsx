import React, { useState, createRef } from "react";
import { styled } from '@mui/material/styles';
import {
  Button,
  Grid,
  TextField,
  Typography,
  Checkbox,
} from "@mui/material";
import { connect } from "react-redux";
import { Section } from "../../ComponentsLibrary";
import {
  BUTTON_ADD_FILE,
  MEDIA_UPLOAD_BUTTON_TEXT,
  MEDIA_UPLOADING,
  MEDIA_PUBLIC,
} from "../../../ui-config/strings";
import { setAppMessage } from "../../../state/actions";
import AppMessage from "../../../ui-models/app-message";
import Auth from "../../../ui-models/auth";
import Address from "../../../ui-models/address";
import State from "../../../ui-models/state";
import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';

const PREFIX = 'Upload';

const classes = {
  fileUploadInput: `${PREFIX}-fileUploadInput`
};

const StyledSection = styled(Section)({
  [`& .${classes.fileUploadInput}`]: {
    display: "none",
  },
});

interface UploadProps {
  auth: Auth;
  address: Address;
  dispatch: () => void;
  resetOverview: any;
}

function Upload({ auth, address, dispatch, resetOverview }: UploadProps) {
  const defaultUploadData = {
    title: "",
    caption: "",
    uploading: false,
    public: false,
  };
  const [uploadData, setUploadData] = useState(defaultUploadData);
  const fileInput = createRef();
  const [uploading, setUploading] = useState(false);

  const onUploadDataChanged = (e: any) =>
    setUploadData(
      Object.assign({}, uploadData, {
        [e.target.name]:
          e.target.type === "checkbox" ? e.target.checked : e.target.value,
      })
    );

  // const uploadToLocalDisk = async () => {
  //   const fD = new window.FormData();
  //   fD.append("title", uploadData.title);
  //   fD.append("caption", uploadData.caption);
  //   fD.append("file", fileInput.current.files[0]);

  //   setUploadData(
  //     Object.assign({}, uploadData, {
  //       uploading: true,
  //     })
  //   );

  //   try {
  //     setUploading(true);

  //     let res = await fetch(`${address.backend}/media`, {
  //       method: "POST",
  //       headers: {
  //         Authorization: `Bearer ${auth.token}`,
  //       },
  //       body: fD,
  //     });
  //     res = await res.json();

  //     if (res.media) {
  //       setUploadData(defaultUploadData);
  //       dispatch(setAppMessage(new AppMessage(FILE_UPLOAD_SUCCESS)));
  //       resetOverview();
  //     } else {
  //       dispatch(setAppMessage(new AppMessage(res.message)));
  //     }
  //   } catch (err) {
  //     dispatch(setAppMessage(new AppMessage(err.message)));
  //   } finally {
  //     setUploading(false);
  //   }
  // };

  const uploadToServer = async () => {
    const fD = new window.FormData();
    fD.append("title", uploadData.title);
    fD.append("caption", uploadData.caption);
    fD.append("file", (fileInput as any).current.files[0]);
    fD.append("public", uploadData.public.toString());

    setUploadData(
      Object.assign({}, uploadData, {
        uploading: true,
      })
    );

    try {
      setUploading(true);

      let res = await fetch(`${address.backend}/media`, {
        method: "POST",
        credentials: 'same-origin',
        body: fD,
      });
      res = await res.json();

      (dispatch as ThunkDispatch<State, null, AnyAction>)(setAppMessage(new AppMessage(res.message)));
      resetOverview();
    } catch (err) {
      (dispatch as ThunkDispatch<State, null, AnyAction>)(setAppMessage(new AppMessage(err.message)));
    } finally {
      setUploading(false);
    }
  };

  const onUpload = async (e) => {
    e.preventDefault();

    await uploadToServer();
  };

  return (
    <StyledSection>
      <form onSubmit={onUpload}>
        <Button variant="outlined" component="label" color="primary">
          {BUTTON_ADD_FILE}
          <input
            type="file"
            name="file"
            ref={fileInput}
            className={classes.fileUploadInput}
          />
        </Button>
        <TextField
          variant="outlined"
          label="Alt text"
          fullWidth
          margin="normal"
          name="caption"
          value={uploadData.caption}
          onChange={onUploadDataChanged}
        />
        <Grid container alignItems="center">
          <Grid item>
            <Typography variant="body1">{MEDIA_PUBLIC}</Typography>
          </Grid>
          <Grid item>
            <Checkbox name="public" onChange={onUploadDataChanged} />
          </Grid>
        </Grid>
        <Button type="submit" disabled={uploading} variant="outlined">
          {uploading ? MEDIA_UPLOADING : MEDIA_UPLOAD_BUTTON_TEXT}
        </Button>
      </form>
    </StyledSection>
  );
}

const mapStateToProps = (state: State) => ({
  address: state.address,
  auth: state.auth,
});

const mapDispatchToProps = (dispatch: () => void) => ({
  dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(Upload);
