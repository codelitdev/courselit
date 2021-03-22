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
import { addressProps, authProps, profileProps } from "../../../types";
import { OverviewAndDetail } from "@courselit/components-library";
import dynamic from "next/dynamic";
import { networkAction } from "../../../redux/actions";
const Upload = dynamic(() => import("./Upload.js"));
const Editor = dynamic(() => import("./Editor.js"));
const Img = dynamic(() => import("../../Img.js"));

const Index = (props) => {
  const [mediaPaginationOffset, setMediaPaginationOffset] = useState(1);
  const [creatorMedia, setCreatorMedia] = useState([]);
  const [componentsMap, setComponentsMap] = useState([]);
  const [searchText] = useState("");

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async () => {
    const query = `
    query {
      media: getCreatorMedia(offset: ${mediaPaginationOffset}, searchText: "${searchText}") {
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
        setCreatorMedia([...creatorMedia, ...filteredMedia]);
        setMediaPaginationOffset(mediaPaginationOffset + 1);
      }
    } catch (err) {
    } finally {
      props.dispatch(networkAction(false));
    }
  };

  useEffect(() => {
    const map = [];
    creatorMedia.map((media) => {
      map.push(getComponentConfig(media));
    });
    map.push({
      Overview: <Button onClick={loadMedia}>{LOAD_MORE_TEXT}</Button>,
    });
    map.unshift(getAddMediaComponentConfig());
    setComponentsMap(map);
  }, [mediaPaginationOffset]);

  const getAddMediaComponentConfig = () => ({
    subtitle: MEDIA_MANAGER_DIALOG_TITLE,
    Overview: (
      <>
        <Img src="" isThumbnail={true} />
        <GridListTileBar title="Add new" />
      </>
    ),
    Detail: <Upload />,
  });

  const getComponentConfig = (media) => ({
    subtitle: HEADER_EDITING_MEDIA,
    Overview: (
      <>
        <Img src={media.id} isThumbnail={true} />
        <GridListTileBar title={media.title} subtitle={media.mimeType} />
      </>
    ),
    Detail: <Editor media={media} />,
  });

  return (
    <OverviewAndDetail
      title={MEDIA_MANAGER_PAGE_HEADING}
      componentsMap={componentsMap}
    />
  );
};

Index.propTypes = {
  auth: authProps,
  profile: profileProps,
  dispatch: PropTypes.func.isRequired,
  address: addressProps,
  mimeTypesToShow: PropTypes.arrayOf(PropTypes.string),
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  profile: state.profile,
  address: state.address,
});

export default connect(mapStateToProps)(Index);
