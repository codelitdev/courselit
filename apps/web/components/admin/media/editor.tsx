import React, { useState } from "react";
import { Button, Grid, Typography, Checkbox } from "@mui/material";
import {
    APP_MESSAGE_CHANGES_SAVED,
    DELETE_MEDIA_POPUP_HEADER,
    POPUP_CANCEL_ACTION,
    POPUP_OK_ACTION,
    BUTTON_DELETE_MEDIA,
    MEDIA_PUBLIC,
} from "../../../ui-config/strings";
import dynamic from "next/dynamic";
import { getGraphQLQueryFields } from "../../../ui-lib/utils";
import { FetchBuilder } from "@courselit/utils";
import { AppMessage } from "@courselit/common-models";
import { connect } from "react-redux";
import { useRouter } from "next/router";
import { Section } from "@courselit/components-library";
import type { Auth, Address } from "@courselit/common-models";
import type { AppDispatch, AppState } from "@courselit/state-management";
import { actionCreators } from "@courselit/state-management";
import { responses } from "../../../config/strings";

const { networkAction, setAppMessage } = actionCreators;

const AppDialog = dynamic(() => import("../../public/app-dialog"));
const MediaPreview = dynamic(() => import("./media-preview"));

interface EditorProps {
    auth: Auth;
    media: any;
    address: Address;
    dispatch: AppDispatch;
    onMediaEdited: () => void;
    onMediaDeleted: (id: string) => void;
}

function Editor({
    auth,
    media,
    address,
    dispatch,
    onMediaEdited,
    onMediaDeleted,
}: EditorProps) {
    const [mediaBeingEdited, setMediaBeingEdited] = useState(media);
    const [deleteMediaPopupOpened, setDeleteMediaPopupOpened] = useState(false);
    const Router = useRouter();

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
            dispatch(setAppMessage(new AppMessage(responses.media_deleted)));
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
                    setAppMessage(new AppMessage(APP_MESSAGE_CHANGES_SAVED))
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
                                {MEDIA_PUBLIC}
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
                        {BUTTON_DELETE_MEDIA}
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
            <AppDialog
                onOpen={deleteMediaPopupOpened}
                onClose={closeDeleteMediaPopup}
                title={DELETE_MEDIA_POPUP_HEADER}
                actions={[
                    {
                        name: POPUP_CANCEL_ACTION,
                        callback: closeDeleteMediaPopup,
                    },
                    { name: POPUP_OK_ACTION, callback: onMediaDelete },
                ]}
            />
        </Grid>
    );
}

const mapStateToProps = (state: AppState) => ({
    address: state.address,
    auth: state.auth,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(Editor);
