import * as React from "react";
import { Button, Grid, Typography, Checkbox } from "@mui/material";
import { FetchBuilder, getGraphQLQueryFields } from "@courselit/utils";
import { AppMessage, Media } from "@courselit/common-models";
import type { Address } from "@courselit/common-models";
import type { AppDispatch } from "@courselit/state-management";
import { actionCreators } from "@courselit/state-management";
import Dialog from "../../dialog";
import Section from "../../section";

const { useState } = React;
const { networkAction, setAppMessage } = actionCreators;

interface Strings {
    changesSaved?: string;
    mediaDeleted?: string;
    deleteMediaPopupHeader?: string;
    popupCancelAction?: string;
    popupOKAction?: string;
    deleteMediaButton?: string;
    publiclyAvailable?: string;
}

interface EditorProps {
    media: any;
    address: Address;
    dispatch: AppDispatch;
    onMediaEdited: (media: Media) => void;
    onMediaDeleted: (id: string) => void;
    strings: Strings;
}

function Editor({
    media,
    address,
    dispatch,
    onMediaEdited,
    onMediaDeleted,
    strings,
}: EditorProps) {
    const [mediaBeingEdited, setMediaBeingEdited] = useState(media);
    const [deleteMediaPopupOpened, setDeleteMediaPopupOpened] = useState(false);

    const onMediaBeingEditedChanged = (e: any) =>
        setMediaBeingEdited(
            Object.assign({}, mediaBeingEdited, {
                [e.target.name]:
                    e.target.type === "checkbox"
                        ? e.target.checked
                        : e.target.value,
            })
        );

    const onMediaDelete = async () => {
        setDeleteMediaPopupOpened(false);

        try {
            dispatch(networkAction(true));
            const fetch = new FetchBuilder()
                .setUrl(
                    `${address.backend}/api/media/${mediaBeingEdited.mediaId}`
                )
                .setHttpMethod("delete")
                .build();

            const response = await fetch.exec();
            dispatch(
                setAppMessage(
                    new AppMessage(
                        strings.mediaDeleted ||
                            "The media is deleted. Go back to see your media."
                    )
                )
            );
            onMediaDeleted(mediaBeingEdited.id);
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    const updateMedia = async () => {
        if (
            media.caption === mediaBeingEdited.caption &&
            media.public === mediaBeingEdited.public
        ) {
            return;
        }

        const formattedGraphQLQuery = getGraphQLQueryFields({
            id: mediaBeingEdited.id,
            caption: mediaBeingEdited.caption,
            public: mediaBeingEdited.public,
        });
        const query = `
    mutation {
      media: updateMedia(mediaData: ${formattedGraphQLQuery}) {
        id,
        originalFileName,
        mimeType,
        caption,
        file,
        thumbnail,
        public
      }
    }
    `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            dispatch(networkAction(true));
            const response = await fetch.exec();

            if (response.media) {
                dispatch(
                    setAppMessage(
                        new AppMessage(strings.changesSaved || "Changes saved")
                    )
                );
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
            <Grid item xs={12}>
                <Section>
                    <Grid
                        container
                        alignItems="center"
                        justifyContent="space-between"
                    >
                        <Grid item>
                            <Typography variant="body1">
                                {strings.publiclyAvailable ||
                                    "Publicly available"}
                            </Typography>
                        </Grid>
                        <Grid item>
                            <Checkbox
                                name="public"
                                checked={mediaBeingEdited.public}
                                onChange={onMediaBeingEditedChanged}
                                disabled={true}
                            />
                        </Grid>
                    </Grid>
                    <Button
                        onClick={() => setDeleteMediaPopupOpened(true)}
                        variant="outlined"
                        color="error"
                    >
                        {strings.deleteMediaButton || "Delete"}
                    </Button>
                </Section>
                {/* <Section>
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
                  name="caption"
                  value={mediaBeingEdited.caption}
                  onChange={onMediaBeingEditedChanged}
                />
                <Grid container alignItems="center">
                  <Grid item>
                    <Typography variant="body1">{MEDIA_PUBLIC}</Typography>
                  </Grid>
                  <Grid item>
                    <Checkbox
                      name="public"
                      checked={mediaBeingEdited.public}
                      onChange={onMediaBeingEditedChanged}
                    />
                  </Grid>
                </Grid>
                <Button
                  onClick={updateMedia}
                  disabled={
                    media.caption === mediaBeingEdited.caption &&
                    media.public === mediaBeingEdited.public
                  }
                >
                  {BUTTON_SAVE}
                </Button>
                <Button onClick={() => setDeleteMediaPopupOpened(true)}>
                  {BUTTON_DELETE_MEDIA}
                </Button>
              </form>
            </Grid>
          </Grid>
        </Section> */}
            </Grid>
            {/* <Grid item xs={12} md={6}>
        <MediaPreview item={media} />
      </Grid> */}
            <Dialog
                onOpen={deleteMediaPopupOpened}
                onClose={closeDeleteMediaPopup}
                title={strings.deleteMediaPopupHeader || "Delete this file?"}
                actions={[
                    {
                        name: strings.popupCancelAction || "Cancel",
                        callback: closeDeleteMediaPopup,
                    },
                    {
                        name: strings.popupOKAction || "Delete",
                        callback: onMediaDelete,
                    },
                ]}
            />
        </Grid>
    );
}

export default Editor;
