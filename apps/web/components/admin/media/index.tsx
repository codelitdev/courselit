import React, { useEffect, useState } from "react";
import { styled } from "@mui/material/styles";
import { ImageListItemBar, Button } from "@mui/material";
import { connect } from "react-redux";
import {
    MEDIA_MANAGER_PAGE_HEADING,
    LOAD_MORE_TEXT,
    HEADER_EDITING_MEDIA,
    MEDIA_MANAGER_DIALOG_TITLE,
} from "../../../ui-config/strings";
import { Add } from "@mui/icons-material";
import { OverviewAndDetail, Image } from "@courselit/components-library";
import dynamic from "next/dynamic";
import { actionCreators } from "@courselit/state-management";
import type { AppDispatch, AppState } from "@courselit/state-management";
import { checkPermission } from "../../../ui-lib/utils";
import { AppMessage } from "@courselit/common-models";
import constants from "../../../config/constants";
import type { Auth, Profile, Address, Media } from "@courselit/common-models";
const { permissions } = constants;

const { networkAction, setAppMessage } = actionCreators;

const PREFIX = "index";

const classes = {
    btn: `${PREFIX}-btn`,
};

const StyledOverviewAndDetail = styled(OverviewAndDetail)(
    ({ theme }: { theme: any }) => ({
        [`& .${classes.btn}`]: {
            width: "100%",
            height: "100%",
        },
    })
);

const Upload = dynamic(() => import("./upload"));
const Editor = dynamic(() => import("./editor"));
const MediaPreview = dynamic(() => import("./media-preview"));

interface IndexProps {
    auth: Auth;
    profile: Profile;
    dispatch: AppDispatch;
    address: Address;
    mimeTypesToShow: string[];
    selectionMode: boolean;
    onSelect: (...args: any[]) => void;
    access: "public" | "private";
}

const Index = (props: IndexProps) => {
    const [mediaPaginationOffset, setMediaPaginationOffset] = useState(1);
    const [creatorMedia, setCreatorMedia] = useState<Media[]>([]);
    const [componentsMap, setComponentsMap] = useState([]);
    const [refreshMedia, setRefreshMedia] = useState(0);
    const [searchText] = useState("");
    const { address } = props;

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
        try {
            props.dispatch(networkAction(true));
            const response: any = await fetch(
                `${address.backend}/api/media?${getUrlSearchParamQuery()}`
            );
            const mediaItems = await response.json();

            if (response.status !== 200) {
                throw new Error(mediaItems.error);
            }

            if (mediaItems.length > 0) {
                const filteredMedia =
                    props.mimeTypesToShow && props.mimeTypesToShow.length
                        ? mediaItems.filter((item: Media) =>
                              props.mimeTypesToShow.includes(item.mimeType)
                          )
                        : mediaItems;
                setCreatorMedia([...creatorMedia, ...filteredMedia]);
                setMediaPaginationOffset(mediaPaginationOffset + 1);
            }
        } catch (err: any) {
            props.dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            props.dispatch(networkAction(false));
        }
    };

    const getUrlSearchParamQuery = () => {
        const urlSearchParams = new URLSearchParams();
        urlSearchParams.append("page", mediaPaginationOffset.toString());
        if (props.access) {
            urlSearchParams.append("access", props.access);
        }

        return urlSearchParams.toString();
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
        if (
            checkPermission(props.profile.permissions, [
                permissions.uploadMedia,
            ])
        ) {
            map.unshift(getAddMediaComponentConfig());
        }
        setComponentsMap(map);
    };

    const getComponentConfig = (media: Media) => {
        const componentConfig = {
            Overview: (
                <>
                    <Image src={media.thumbnail!} />
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
                <div>
                    <MediaPreview item={media} />
                    <Editor
                        media={media}
                        onMediaEdited={onMediaEdited}
                        onMediaDeleted={onMediaDeleted}
                    />
                </div>
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
            item.mediaId === editedMedia.mediaId ? editedMedia : item
        );
        composeOverView(mediaAfterEdit);
        setCreatorMedia(mediaAfterEdit);
    };

    const onMediaDeleted = (id: string) => {
        const mediaAfterDelete = creatorMedia.filter(
            (item: Media) => item.mediaId !== id
        );
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

const mapStateToProps = (state: AppState) => ({
    auth: state.auth,
    profile: state.profile,
    address: state.address,
});

export default connect(mapStateToProps)(Index);
