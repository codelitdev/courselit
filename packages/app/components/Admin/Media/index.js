import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { GridListTileBar, Button } from "@material-ui/core";
import { connect } from "react-redux";
import {
  MEDIA_MANAGER_PAGE_HEADING,
  LOAD_MORE_TEXT,
  HEADER_EDITING_MEDIA,
  MEDIA_MANAGER_DIALOG_TITLE,
} from "../../../config/strings";
import FetchBuilder from "../../../lib/fetch";
import { Add } from "@material-ui/icons";
import { addressProps, authProps, profileProps } from "../../../types";
import { OverviewAndDetail } from "@courselit/components-library";
import dynamic from "next/dynamic";
import { networkAction, setAppMessage } from "../../../redux/actions";
import { checkPermission } from "../../../lib/utils";
import { permissions } from "../../../config/constants";
import AppMessage from "../../../models/app-message";
import { makeStyles } from "@material-ui/styles";
const Upload = dynamic(() => import("./Upload.js"));
const Editor = dynamic(() => import("./Editor.js"));
const Img = dynamic(() => import("../../Img.js"));

const useStyles = makeStyles((theme) => ({
  btn: {
    width: "100%",
    height: "100%",
  },
}));

const Index = (props) => {
  const [mediaPaginationOffset, setMediaPaginationOffset] = useState(1);
  const [creatorMedia, setCreatorMedia] = useState([]);
  const [componentsMap, setComponentsMap] = useState([]);
  const [searchText] = useState("");
  const classes = useStyles();

  useEffect(() => {
    loadMedia();
  }, []);

  useEffect(() => {
    composeOverView(creatorMedia);
  }, [mediaPaginationOffset, creatorMedia]);

  const loadMedia = async (reset = false) => {
    const query = `
    query {
      media: getCreatorMedia(offset: ${
        reset ? 1 : mediaPaginationOffset
      }, searchText: "${searchText}") {
        id,
        originalFileName,
        mimeType,
        altText,
        file,
        thumbnail
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
        setCreatorMedia(
          reset ? filteredMedia : [...creatorMedia, ...filteredMedia]
        );
        const newOffset = reset ? 2 : mediaPaginationOffset + 1;
        setMediaPaginationOffset(newOffset);
      }
    } catch (err) {
      props.dispatch(setAppMessage(new AppMessage(err.message)));
    } finally {
      props.dispatch(networkAction(false));
    }
  };

  const composeOverView = (mediaArr) => {
    const map = [];
    mediaArr.map((media) => {
      map.push(getComponentConfig(media));
    });
    map.push({
      Overview: (
        <Button
          variant="contained"
          className={classes.btn}
          onClick={() => loadMedia()}
        >
          {LOAD_MORE_TEXT}
        </Button>
      ),
    });
    if (
      !props.selectionMode &&
      checkPermission(props.profile.permissions, [permissions.uploadMedia])
    ) {
      map.unshift(getAddMediaComponentConfig());
    }
    setComponentsMap(map);
  };

  const getComponentConfig = (media) => {
    const componentConfig = {
      Overview: (
        <>
          <Img src={media.thumbnail} />
          <GridListTileBar
            title={media.originalFileName}
            subtitle={media.mimeType}
          />
        </>
      ),
    };

    if (!props.selectionMode) {
      componentConfig.subtitle = HEADER_EDITING_MEDIA;
      componentConfig.Detail = (
        <Editor
          media={media}
          onMediaEdited={onMediaEdited}
          onMediaDeleted={onMediaDeleted}
        />
      );
    }

    return componentConfig;
  };

  const getAddMediaComponentConfig = () => ({
    subtitle: MEDIA_MANAGER_DIALOG_TITLE,
    Overview: (
      <>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          className={classes.btn}
        >
          Add new
        </Button>
      </>
    ),
    Detail: <Upload resetOverview={resetOverview} />,
  });

  const resetOverview = async () => {
    await loadMedia(true);
  };

  const onMediaEdited = (editedMedia) => {
    const mediaAfterEdit = creatorMedia.map((item) =>
      item.id === editedMedia.id ? editedMedia : item
    );
    composeOverView(mediaAfterEdit);
    setCreatorMedia(mediaAfterEdit);
  };

  const onMediaDeleted = (id) => {
    const mediaAfterDelete = creatorMedia.filter((item) => item.id !== id);
    composeOverView(mediaAfterDelete);
    setCreatorMedia(mediaAfterDelete);
  };

  const onSelect = (index) => {
    if (Object.prototype.hasOwnProperty.call(props, "onSelect")) {
      props.onSelect(creatorMedia[index]);
    }
  };

  return (
    <OverviewAndDetail
      title={props.selectionMode ? "" : MEDIA_MANAGER_PAGE_HEADING}
      componentsMap={componentsMap}
      onSelect={onSelect}
    />
  );
};

Index.propTypes = {
  auth: authProps,
  profile: profileProps,
  dispatch: PropTypes.func.isRequired,
  address: addressProps,
  mimeTypesToShow: PropTypes.arrayOf(PropTypes.string),
  selectionMode: PropTypes.bool,
  onSelect: PropTypes.func,
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  profile: state.profile,
  address: state.address,
});

export default connect(mapStateToProps)(Index);
