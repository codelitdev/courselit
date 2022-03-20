import React, { useEffect, useState } from "react";
import { styled } from '@mui/material/styles';
import { ImageListItemBar, Button } from "@mui/material";
import { connect } from "react-redux";
import {
  MEDIA_MANAGER_PAGE_HEADING,
  LOAD_MORE_TEXT,
  HEADER_EDITING_MEDIA,
  MEDIA_MANAGER_DIALOG_TITLE,
} from "../../../ui-config/strings";
import FetchBuilder from "../../../ui-lib/fetch";
import { Add } from "@mui/icons-material";
import { OverviewAndDetail } from "../../ComponentsLibrary";
import dynamic from "next/dynamic";
import { networkAction, setAppMessage } from "../../../state/actions";
import { checkPermission } from "../../../ui-lib/utils";
import AppMessage from "../../../ui-models/app-message";
import constants from "../../../config/constants";
import State from "../../../ui-models/state";
import Auth from "../../../ui-models/auth";
import Profile from "../../../ui-models/profile";
import Address from "../../../ui-models/address";
import Media from "../../../ui-models/media";
const { permissions } = constants;

const PREFIX = 'index';

const classes = {
  btn: `${PREFIX}-btn`
};

const StyledOverviewAndDetail
 = styled(OverviewAndDetail
)((
  {
    theme
  } : {
    theme: any;
  }
) => ({
  [`& .${classes.btn}`]: {
    width: "100%",
    height: "100%",
  }
}));

const Upload = dynamic(() => import("./Upload"));
const Editor = dynamic(() => import("./Editor"));
const Img = dynamic(() => import("../../Img"));

interface IndexProps {
  auth: Auth;
  profile: Profile; 
  dispatch: (...args: any[]) => void; 
  address: Address;
  mimeTypesToShow: string[]; 
  selectionMode: boolean;
  onSelect: (...args: any[]) => void;
  public: string;
}
const Index = (props: IndexProps) => {
  const [mediaPaginationOffset, setMediaPaginationOffset] = useState(1);
  const [creatorMedia, setCreatorMedia] = useState<Media[]>([]);
  const [componentsMap, setComponentsMap] = useState([]);
  const [refreshMedia, setRefreshMedia] = useState(0);
  const [searchText] = useState("");


  useEffect(() => {
    loadMedia();
  }, []);

  useEffect(() => {
    loadMedia();
  }, [refreshMedia]);

  useEffect(() => {
    composeOverView(creatorMedia);
  }, [mediaPaginationOffset, creatorMedia]);

  const loadMedia = async () => {
    const query = `
    query {
      media: getCreatorMedia(
        offset: ${mediaPaginationOffset},
        searchText: "${searchText}",
        mimeType: ${
          props.mimeTypesToShow
            ? "[" +
              props.mimeTypesToShow.map((mimeType) => '"' + mimeType + '"') +
              "]"
            : null
        },
        privacy: ${props.public ? '"' + props.public + '"' : null}
      ) {
        id,
        originalFileName,
        mimeType,
        caption,
        file,
        thumbnail,
        public,
        key
      }
    }
    `;
    const fetch = new FetchBuilder()
      .setUrl(`${props.address.backend}/api/graph`)
      .setPayload(query)
      .setIsGraphQLEndpoint(true)
      .build();
    try {
      props.dispatch(networkAction(true));
      const response = await fetch.exec();

      if (response.media && response.media.length > 0) {
        const filteredMedia =
          props.mimeTypesToShow && props.mimeTypesToShow.length
            ? response.media.filter((item: Media) =>
                props.mimeTypesToShow.includes(item.mimeType)
              )
            : response.media;
        setCreatorMedia([...creatorMedia, ...filteredMedia]);
        setMediaPaginationOffset(mediaPaginationOffset + 1);
      }
    } catch (err: any) {
      props.dispatch(setAppMessage(new AppMessage(err.message)));
    } finally {
      props.dispatch(networkAction(false));
    }
  };

  const composeOverView = (mediaArr: Media[]) => {
    const map = [];
    mediaArr.map((media: Media) => {
      map.push(getComponentConfig(media));
    });
    map.push({
      Overview: (
        <Button
          variant="outlined"
          className={classes.btn}
          onClick={() => loadMedia()}
        >
          {LOAD_MORE_TEXT}
        </Button>
      ),
    });
    if (checkPermission(props.profile.permissions, [permissions.uploadMedia])) {
      map.unshift(getAddMediaComponentConfig());
    }
    setComponentsMap(map);
  };

  const getComponentConfig = (media: Media) => {
    const componentConfig = {
      Overview: (
        <>
          <Img src={media.thumbnail!} />
          <ImageListItemBar
            title={media.originalFileName}
            subtitle={media.mimeType}
          />
        </>
      ),
    };

    componentConfig.subtitle = HEADER_EDITING_MEDIA;

    if (!props.selectionMode) {
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
          variant="outlined"
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

  const resetOverview = () => {
    setMediaPaginationOffset(1);
    setCreatorMedia([]);
    setRefreshMedia(refreshMedia + 1);
  };

  const onMediaEdited = (editedMedia: Media) => {
    const mediaAfterEdit = creatorMedia.map((item) =>
      item.id === editedMedia.id ? editedMedia : item
    );
    composeOverView(mediaAfterEdit);
    setCreatorMedia(mediaAfterEdit);
  };

  const onMediaDeleted = (id: string) => {
    const mediaAfterDelete = creatorMedia.filter((item) => item.id !== id);
    composeOverView(mediaAfterDelete);
    setCreatorMedia(mediaAfterDelete);
  };

  const onSelect = (index: number) => {
    if (
      Object.prototype.hasOwnProperty.call(props, "onSelect") &&
      creatorMedia[index - 1]
    ) {
      props.onSelect(creatorMedia[index - 1]);
    }
  };

  return (
    <OverviewAndDetail
      title={MEDIA_MANAGER_PAGE_HEADING}
      componentsMap={componentsMap}
      onSelect={onSelect}
    />
  );
};

const mapStateToProps = (state: State) => ({
  auth: state.auth,
  profile: state.profile,
  address: state.address,
});

export default connect(mapStateToProps)(Index);
