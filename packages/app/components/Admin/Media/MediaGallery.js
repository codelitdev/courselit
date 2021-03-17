import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import {
  Grid,
  TextField,
  GridList,
  GridListTile,
  ListSubheader,
  Button,
  Typography,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import { addressProps, authProps } from "../../../types.js";
import {
  MEDIA_SEARCH_INPUT_PLACEHOLDER,
  LOAD_MORE_TEXT,
  BUTTON_SEARCH,
  HEADER_YOUR_MEDIA,
  BUTTON_DELETE_MEDIA,
  DELETE_MEDIA_POPUP_HEADER,
  POPUP_CANCEL_ACTION,
  POPUP_OK_ACTION,
  BUTTON_CANCEL_TEXT,
  HEADER_EDITING_MEDIA,
  APP_MESSAGE_MEDIA_DELETED,
  BUTTON_SAVE,
  APP_MESSAGE_MEDIA_UPDATED,
} from "../../../config/strings.js";
import AppLoader from "../../AppLoader.js";
import FetchBuilder from "../../../lib/fetch.js";
import { networkAction, setAppMessage } from "../../../redux/actions.js";
import MediaGalleryItem from "./MediaGalleryItem.js";
import AppDialog from "../../Public/AppDialog.js";
import MediaPreview from "./MediaPreview.js";
import fetch from "isomorphic-unfetch";
import AppMessage from "../../../models/app-message.js";
import {
  getObjectContainingOnlyChangedFields,
  getGraphQLQueryFields,
} from "../../../lib/utils.js";
import Router from "next/router";

const useStyles = makeStyles((theme) => ({
  searchField: {
    flexGrow: 1,
    marginRight: theme.spacing(2),
  },
  cardHeader: {
    marginBottom: theme.spacing(2),
  },
  mediaGrid: {
    paddingBottom: theme.spacing(2),
  },
  mediaGridHeader: {
    height: "auto",
  },
  gridListItemIcon: {
    color: "#fff",
  },
}));

const MediaGallery = (props) => {
  const defaultUserMedia = [];
  const defaultMediaOffset = 1;
  const [mediaOffset, setMediaOffset] = useState(defaultMediaOffset);
  const [searchText, setSearchText] = useState("");
  const [userMedia, setUserMedia] = useState(defaultUserMedia);
  const [mediaBeingEdited, setMediaBeingEdited] = useState(null);
  const [deleteMediaPopupOpened, setDeleteMediaPopupOpened] = useState(false);
  const classes = useStyles();

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async () => {
    const query = `
    query {
      media: getCreatorMedia(offset: ${mediaOffset}, searchText: "${searchText}") {
        id,
        title,
        mimeType,
        altText
      }
    }
    `;
    const fetch = new FetchBuilder()
      .setUrl(`${props.address.backend}/graph`)
      .setPayload(query)
      .setIsGraphQLEndpoint(true)
      .setAuthToken(props.auth.token)
      .build();
    try {
      props.dispatch(networkAction(true));
      const response = await fetch.exec();

      if (response.media && response.media.length > 0) {
        const filteredMedia =
          props.mimeTypesToShow && props.mimeTypesToShow.length
            ? response.media.filter((item) =>
                props.mimeTypesToShow.includes(item.mimeType)
              )
            : response.media;
        setUserMedia([...userMedia, ...filteredMedia]);
        setMediaOffset(mediaOffset + 1);
      }
    } catch (err) {
    } finally {
      props.dispatch(networkAction(false));
    }
  };

  const searchMedia = (e) => {
    e.preventDefault();
    reset();

    loadMedia();
  };

  const reset = () => {
    setUserMedia(defaultUserMedia);
    setMediaOffset(defaultMediaOffset);
  };

  const onSearchTextChanged = (e) => setSearchText(e.target.value);

  const onMediaSelected = (mediaId) =>
    props.onMediaSelected && props.onMediaSelected(mediaId);

  const toggleMediaEditForm = (mediaItem = null) =>
    setMediaBeingEdited(mediaItem);

  const closeDeleteMediaPopup = () => setDeleteMediaPopupOpened(false);

  const onMediaBeingEditedChanged = (e) =>
    setMediaBeingEdited(
      Object.assign({}, mediaBeingEdited, {
        [e.target.name]: e.target.value,
      })
    );

  const onMediaDelete = async () => {
    setDeleteMediaPopupOpened(false);

    try {
      props.dispatch(networkAction(true));
      const res = await fetch(
        `${props.address.backend}/media/${mediaBeingEdited.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${props.auth.token}`,
          },
        }
      );

      if (res.status === 401) {
        Router.push("/login");
        return;
      }

      if (res.status === 200) {
        props.dispatch(
          setAppMessage(new AppMessage(APP_MESSAGE_MEDIA_DELETED))
        );
        const indexOfDeletedMedia = userMedia
          .map((media) => media.id)
          .indexOf(mediaBeingEdited.id);
        setUserMedia([
          ...userMedia.slice(0, indexOfDeletedMedia),
          ...userMedia.slice(indexOfDeletedMedia + 1),
        ]);
        toggleMediaEditForm();
      }
    } catch (err) {
      props.dispatch(setAppMessage(new AppMessage(err.message)));
    } finally {
      props.dispatch(networkAction(false));
    }
  };

  const updateMedia = async () => {
    const indexOfUpdatedMedia = userMedia
      .map((media) => media.id)
      .indexOf(mediaBeingEdited.id);
    const onlyChangedFields = getObjectContainingOnlyChangedFields(
      userMedia[indexOfUpdatedMedia],
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
      .setUrl(`${props.address.backend}/graph`)
      .setPayload(query)
      .setIsGraphQLEndpoint(true)
      .setAuthToken(props.auth.token)
      .build();
    try {
      props.dispatch(networkAction(true));
      const response = await fetch.exec();

      if (response.media) {
        props.dispatch(
          setAppMessage(new AppMessage(APP_MESSAGE_MEDIA_UPDATED))
        );
        userMedia[indexOfUpdatedMedia].title = response.media.title;
        userMedia[indexOfUpdatedMedia].altText = response.media.altText;
        toggleMediaEditForm();
      }
    } catch (err) {
      props.dispatch(setAppMessage(new AppMessage(err.message)));
    } finally {
      props.dispatch(networkAction(false));
    }
  };

  return (
    <>
      {!mediaBeingEdited && (
        <div>
          <form onSubmit={searchMedia}>
            <Grid container direction="row" alignItems="center">
              <Grid item className={classes.searchField}>
                <TextField
                  value={searchText}
                  variant="outlined"
                  label=""
                  fullWidth
                  margin="normal"
                  placeholder={MEDIA_SEARCH_INPUT_PLACEHOLDER}
                  onChange={onSearchTextChanged}
                />
              </Grid>
              <Grid item>
                <Button
                  type="submit"
                  variant={
                    searchText.trim().length !== 0 ? "contained" : "text"
                  }
                  disabled={searchText.trim().length === 0}
                >
                  {BUTTON_SEARCH}
                </Button>
              </Grid>
            </Grid>
          </form>
          <GridList cols={3} className={classes.mediaGrid}>
            <GridListTile cols={3} key="Subheader" style={{ height: "auto" }}>
              <ListSubheader component="div">{HEADER_YOUR_MEDIA}</ListSubheader>
            </GridListTile>
            {userMedia.map((item) => (
              <GridListTile
                key={item.id}
                cols={1}
                onClick={() => onMediaSelected(item.id)}
              >
                <MediaGalleryItem
                  item={item}
                  toggleMediaEditForm={toggleMediaEditForm}
                />
              </GridListTile>
            ))}
          </GridList>
          {props.networkAction && <AppLoader />}
          <Button onClick={loadMedia}>{LOAD_MORE_TEXT}</Button>
        </div>
      )}
      {mediaBeingEdited && (
        <div>
          <Typography variant="h6">{HEADER_EDITING_MEDIA}</Typography>
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
          <Button onClick={() => toggleMediaEditForm()}>
            {BUTTON_CANCEL_TEXT}
          </Button>
          <Button onClick={() => setDeleteMediaPopupOpened(true)}>
            {BUTTON_DELETE_MEDIA}
          </Button>
        </div>
      )}
      <AppDialog
        onOpen={deleteMediaPopupOpened}
        onClose={closeDeleteMediaPopup}
        title={DELETE_MEDIA_POPUP_HEADER}
        actions={[
          { name: POPUP_CANCEL_ACTION, callback: closeDeleteMediaPopup },
          { name: POPUP_OK_ACTION, callback: onMediaDelete },
        ]}
      ></AppDialog>
    </>
  );
};

MediaGallery.propTypes = {
  auth: authProps,
  dispatch: PropTypes.func.isRequired,
  networkAction: PropTypes.bool.isRequired,
  onMediaSelected: PropTypes.func,
  mimeTypesToShow: PropTypes.arrayOf(PropTypes.string),
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

export default connect(mapStateToProps, mapDispatchToProps)(MediaGallery);
