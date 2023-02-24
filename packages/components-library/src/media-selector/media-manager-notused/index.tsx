import * as React from "react";
import { ImageListItemBar, Button } from "@mui/material";
import { Add } from "@mui/icons-material";
import { actionCreators } from "@courselit/state-management";
import type { AppDispatch, AppState } from "@courselit/state-management";
import { AppMessage, Media, UIConstants } from "@courselit/common-models";
import type { Auth, Profile, Address } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";
import Upload from "./upload";
import Editor from "./editor";
import MediaPreview from "./media-preview";
import Image from "../../image";
import Access from "../access";

const { useEffect, useState } = React;
const { networkAction, setAppMessage } = actionCreators;

interface Strings {
    header?: string;
    loadMoreText?: string;
    editingArea?: string;
    dialogTitle?: string;
    buttonAddFile?: string;
    fileUploaded?: string;
    uploadFailed?: string;
    uploading?: string;
    uploadButtonText?: string;
    headerMediaPreview?: string;
    originalFileNameHeader?: string;
    previewPDFFile?: string;
    directUrl?: string;
    urlCopied?: string;
    fileType?: string;
    changesSaved?: string;
    mediaDeleted?: string;
    deleteMediaPopupHeader?: string;
    popupCancelAction?: string;
    popupOKAction?: string;
    deleteMediaButton?: string;
    publiclyAvailable?: string;
}

interface IndexProps {
    auth: Auth;
    profile: Profile;
    dispatch: AppDispatch;
    address: Address;
    mimeTypesToShow?: string[];
    selectionMode: boolean;
    onSelect: (...args: any[]) => void;
    strings: Strings;
    access?: Access;
}

const Index = (props: IndexProps) => {
    const [mediaPaginationOffset, setMediaPaginationOffset] = useState(1);
    const [creatorMedia, setCreatorMedia] = useState<Media[]>([]);
    const [_, setComponentsMap] = useState([]);
    const [refreshMedia, setRefreshMedia] = useState(0);
    const { address, strings, dispatch, profile } = props;

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
            Overview: [
                <Button variant="outlined" onClick={() => loadMedia()}>
                    {props.strings.loadMoreText || "Load more"}
                </Button>,
            ],
        });
        if (
            checkPermission(profile.permissions, [
                UIConstants.permissions.uploadMedia,
            ])
        ) {
            map.unshift(getAddMediaComponentConfig());
        }
        setComponentsMap(map);
    };

    const getComponentConfig = (media: Media) => {
        const componentConfig: Record<string, unknown> = {
            Overview: [
                <Image src={media.thumbnail!} />,
                <ImageListItemBar
                    title={media.originalFileName}
                    subtitle={media.mimeType}
                />,
            ],
        };

        componentConfig.subtitle = props.strings.editingArea || "Edit media";

        if (!props.selectionMode) {
            componentConfig.Detail = (
                <div>
                    <MediaPreview
                        item={media}
                        dispatch={dispatch}
                        address={address}
                        strings={{
                            headerMediaPreview: strings.headerMediaPreview,
                            originalFileNameHeader:
                                strings.originalFileNameHeader,
                            previewPDFFile: strings.previewPDFFile,
                            directUrl: strings.directUrl,
                            urlCopied: strings.urlCopied,
                            fileType: strings.fileType,
                        }}
                    />
                    <Editor
                        address={address}
                        dispatch={dispatch}
                        media={media}
                        onMediaEdited={onMediaEdited}
                        onMediaDeleted={onMediaDeleted}
                        strings={{
                            changesSaved: strings.changesSaved,
                            mediaDeleted: strings.mediaDeleted,
                            deleteMediaPopupHeader:
                                strings.deleteMediaPopupHeader,
                            popupCancelAction: strings.popupCancelAction,
                            popupOKAction: strings.popupOKAction,
                            deleteMediaButton: strings.deleteMediaButton,
                            publiclyAvailable: strings.publiclyAvailable,
                        }}
                    />
                </div>
            );
        }

        return componentConfig;
    };

    const getAddMediaComponentConfig = () => ({
        subtitle: props.strings.dialogTitle || "Add media",
        Overview: [
            <Button variant="outlined" color="primary" startIcon={<Add />}>
                Add new
            </Button>,
        ],
        Detail: (
            <Upload
                resetOverview={resetOverview}
                address={address}
                dispatch={dispatch}
                access={props.access}
                onSelect={onSelect}
                strings={{
                    buttonAddFile: strings.buttonAddFile,
                    fileUploaded: strings.fileUploaded,
                    uploadFailed: strings.uploadFailed,
                    uploading: strings.uploading,
                    uploadButtonText: strings.uploadButtonText,
                    publiclyAvailable: strings.publiclyAvailable,
                }}
            />
        ),
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
        <Upload
            resetOverview={resetOverview}
            address={address}
            dispatch={dispatch}
            access={props.access}
            onSelect={props.onSelect}
            strings={{
                buttonAddFile: strings.buttonAddFile,
                fileUploaded: strings.fileUploaded,
                uploadFailed: strings.uploadFailed,
                uploading: strings.uploading,
                uploadButtonText: strings.uploadButtonText,
                publiclyAvailable: strings.publiclyAvailable,
            }}
        />
        // <OverviewAndDetail
        //     title={props.strings.header || "Media"}
        //     componentsMap={componentsMap}
        //     onSelect={onSelect}
        // />
    );
};

export default Index;
