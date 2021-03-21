import React, { useState } from "react";
import PropTypes from "prop-types";
import { Button, TextField } from "@material-ui/core";
import {
  APP_MESSAGE_MEDIA_DELETED,
  APP_MESSAGE_MEDIA_UPDATED,
  DELETE_MEDIA_POPUP_HEADER,
  POPUP_CANCEL_ACTION,
  POPUP_OK_ACTION,
  BUTTON_DELETE_MEDIA,
  BUTTON_SAVE,
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

const AppDialog = dynamic(() => import("../../Public/AppDialog"));
const MediaPreview = dynamic(() => import("./MediaPreview"));

function Editor({ auth, media, address, dispatch }) {
  const [mediaBeingEdited, setMediaBeingEdited] = useState(media);
  const [deleteMediaPopupOpened, setDeleteMediaPopupOpened] = useState(false);
  const Router = useRouter();

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

      if (res.status === 200) {
        dispatch(setAppMessage(new AppMessage(APP_MESSAGE_MEDIA_DELETED)));
        // const indexOfDeletedMedia = userMedia
        //   .map((media) => media.id)
        //   .indexOf(mediaBeingEdited.id);
        // setUserMedia([
        //   ...userMedia.slice(0, indexOfDeletedMedia),
        //   ...userMedia.slice(indexOfDeletedMedia + 1),
        // ]);
      }
    } catch (err) {
      dispatch(setAppMessage(new AppMessage(err.message)));
    } finally {
      dispatch(networkAction(false));
    }
  };

  const updateMedia = async () => {
    const onlyChangedFields = getObjectContainingOnlyChangedFields(
      media,
      mediaBeingEdited
    );
    if (Object.keys(onlyChangedFields).length === 0) {
      return;
    }
    onlyChangedFields.id = mediaBeingEdited.id;
    const formattedGraphQLQuery = getGraphQLQueryFields(onlyChangedFields);
    const query = `
    mutation {
      media: updateMedia(mediaData: ${formattedGraphQLQuery}) {
        id,
        title,
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
        dispatch(setAppMessage(new AppMessage(APP_MESSAGE_MEDIA_UPDATED)));
      }
    } catch (err) {
      dispatch(setAppMessage(new AppMessage(err.message)));
    } finally {
      dispatch(networkAction(false));
    }
  };

  const closeDeleteMediaPopup = () => setDeleteMediaPopupOpened(false);

  return (
    <div>
      <MediaPreview
        id={mediaBeingEdited.id}
        mimeType={mediaBeingEdited.mimeType}
      />
      <form>
        <TextField
          required
          variant="outlined"
          label="Title"
          fullWidth
          margin="normal"
          name="title"
          value={mediaBeingEdited.title}
          onChange={onMediaBeingEditedChanged}
        />
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
      </form>
      <Button onClick={updateMedia}>{BUTTON_SAVE}</Button>
      <Button onClick={() => setDeleteMediaPopupOpened(true)}>
        {BUTTON_DELETE_MEDIA}
      </Button>
      <AppDialog
        onOpen={deleteMediaPopupOpened}
        onClose={closeDeleteMediaPopup}
        title={DELETE_MEDIA_POPUP_HEADER}
        actions={[
          { name: POPUP_CANCEL_ACTION, callback: closeDeleteMediaPopup },
          { name: POPUP_OK_ACTION, callback: onMediaDelete },
        ]}
      />
    </div>
  );
}

Editor.propTypes = {
  media: PropTypes.object.isRequired,
  auth: authProps,
  address: addressProps,
  dispatch: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  address: state.address,
  auth: state.auth,
});

const mapDispatchToProps = (dispatch) => ({
  dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(Editor);
