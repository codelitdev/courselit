import React, { useState } from "react";
import PropTypes from "prop-types";
import { Button, TextField, Grid, Typography } from "@material-ui/core";
import {
  APP_MESSAGE_CHANGES_SAVED,
  DELETE_MEDIA_POPUP_HEADER,
  POPUP_CANCEL_ACTION,
  POPUP_OK_ACTION,
  BUTTON_DELETE_MEDIA,
  BUTTON_SAVE,
  MEDIA_EDITOR_HEADER_EDIT_DETAILS,
} from "../../../config/strings";
import dynamic from "next/dynamic";
import {
  getGraphQLQueryFields,
  getObjectContainingOnlyChangedFields,
} from "../../../lib/utils";
import FetchBuilder from "../../../lib/fetch";
import AppMessage from "../../../models/app-message";
import { addressProps, authProps } from "../../../types";
import { connect } from "react-redux";
import { networkAction, setAppMessage } from "../../../redux/actions";
import { useRouter } from "next/router";
import fetch from "isomorphic-unfetch";
import { Section } from "@courselit/components-library";

const AppDialog = dynamic(() => import("../../Public/AppDialog"));
const MediaPreview = dynamic(() => import("./MediaPreview"));

function Editor({
  auth,
  media,
  address,
  dispatch,
  onMediaEdited,
  onMediaDeleted,
}) {
  const [mediaBeingEdited, setMediaBeingEdited] = useState(media);
  const [deleteMediaPopupOpened, setDeleteMediaPopupOpened] = useState(false);
  const Router = useRouter();
  const onlyChangedFields = getObjectContainingOnlyChangedFields(
    media,
    mediaBeingEdited
  );

  const onMediaBeingEditedChanged = (e) =>
    setMediaBeingEdited(
      Object.assign({}, mediaBeingEdited, {
        [e.target.name]: e.target.value,
      })
    );

  const onMediaDelete = async () => {
    setDeleteMediaPopupOpened(false);

    try {
      dispatch(networkAction(true));
      const res = await fetch(
        `${address.backend}/media/${mediaBeingEdited.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      );

      if (res.status === 401) {
        Router.push("/login");
        return;
      }

      const { message } = await res.json();
      if (res.status === 200) {
        dispatch(setAppMessage(new AppMessage(message)));
        onMediaDeleted(mediaBeingEdited.id);
      } else {
        throw new Error(message);
      }
    } catch (err) {
      dispatch(setAppMessage(new AppMessage(err.message)));
    } finally {
      dispatch(networkAction(false));
    }
  };

  const updateMedia = async () => {
    if (Object.keys(onlyChangedFields).length === 0) {
      return;
    }
    onlyChangedFields.id = mediaBeingEdited.id;
    const formattedGraphQLQuery = getGraphQLQueryFields(onlyChangedFields);
    const query = `
    mutation {
      media: updateMedia(mediaData: ${formattedGraphQLQuery}) {
        id,
        mimeType,
        altText
      }
    }
    `;
    const fetch = new FetchBuilder()
      .setUrl(`${address.backend}/graph`)
      .setPayload(query)
      .setIsGraphQLEndpoint(true)
      .setAuthToken(auth.token)
      .build();
    try {
      dispatch(networkAction(true));
      const response = await fetch.exec();

      if (response.media) {
        dispatch(setAppMessage(new AppMessage(APP_MESSAGE_CHANGES_SAVED)));
        onMediaEdited(response.media);
      }
    } catch (err) {
      dispatch(setAppMessage(new AppMessage(err.message)));
    } finally {
      dispatch(networkAction(false));
    }
  };

  const closeDeleteMediaPopup = () => setDeleteMediaPopupOpened(false);

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Section>
          <Grid container direction="column" spacing={1}>
            <Grid item>
              <Typography variant="h4">
                {MEDIA_EDITOR_HEADER_EDIT_DETAILS}
              </Typography>
            </Grid>
            <Grid item>
              <form>
                <TextField
                  required
                  variant="outlined"
                  label="Alt text"
                  fullWidth
                  margin="normal"
                  name="altText"
                  value={mediaBeingEdited.altText}
                  onChange={onMediaBeingEditedChanged}
                />
                <Button
                  onClick={updateMedia}
                  disabled={Object.keys(onlyChangedFields).length === 0}
                >
                  {BUTTON_SAVE}
                </Button>
                <Button onClick={() => setDeleteMediaPopupOpened(true)}>
                  {BUTTON_DELETE_MEDIA}
                </Button>
              </form>
            </Grid>
          </Grid>
        </Section>
      </Grid>
      <Grid item xs={12} md={6}>
        <MediaPreview item={media} />
      </Grid>
      <AppDialog
        onOpen={deleteMediaPopupOpened}
        onClose={closeDeleteMediaPopup}
        title={DELETE_MEDIA_POPUP_HEADER}
        actions={[
          { name: POPUP_CANCEL_ACTION, callback: closeDeleteMediaPopup },
          { name: POPUP_OK_ACTION, callback: onMediaDelete },
        ]}
      />
    </Grid>
  );
}

Editor.propTypes = {
  media: PropTypes.object.isRequired,
  auth: authProps,
  address: addressProps,
  dispatch: PropTypes.func.isRequired,
  onMediaEdited: PropTypes.func.isRequired,
  onMediaDeleted: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  address: state.address,
  auth: state.auth,
});

const mapDispatchToProps = (dispatch) => ({
  dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(Editor);
