import React, { useEffect, useState } from "react";
import { styled } from "@mui/material/styles";
import {
    Grid,
    Typography,
    TextField,
    IconButton,
    InputAdornment,
} from "@mui/material";
import {
    HEADER_MEDIA_PREVIEW,
    MEDIA_EDITOR_ORIGINAL_FILE_NAME_HEADER,
    PREVIEW_PDF_FILE,
    MEDIA_DIRECT_URL,
    MEDIA_URL_COPIED,
    MEDIA_FILE_TYPE,
} from "../../../ui-config/strings";
import { connect } from "react-redux";
import { Section } from "@courselit/components-library";
import { FileCopy } from "@mui/icons-material";
import { AppMessage } from "@courselit/common-models";
import type { AppDispatch, AppState } from "@courselit/state-management";
import type { Address, Media } from "@courselit/common-models";
import { FetchBuilder } from "@courselit/utils";
import { actionCreators } from "@courselit/state-management";
import { Image } from "@courselit/components-library";

const { networkAction, setAppMessage } = actionCreators;

const PREFIX = "MediaPreview";

const classes = {
    video: `${PREFIX}-video`,
    img: `${PREFIX}-img`,
    link: `${PREFIX}-link`,
};

const StyledSection = styled(Section)({
    [`& .${classes.video}`]: {
        minWidth: 200,
        maxWidth: "100%",
        width: 400,
        height: "auto",
    },
    [`& .${classes.img}`]: {
        maxHeight: 200,
    },
    [`& .${classes.link}`]: {
        wordBreak: "break-all",
    },
});

interface MediaPreviewProps {
    item: Media;
    address: Address;
    dispatch: AppDispatch;
}

const MediaPreview = (props: MediaPreviewProps) => {
    const [item, setItem] = useState(props.item);
    const { dispatch, address } = props;
    const { mediaId, originalFileName, mimeType, caption, file, size, access } =
        item;

    useEffect(() => {
        getMediaDetails();
    }, []);

    const getMediaDetails = async () => {
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/media/${mediaId}`)
            .setHttpMethod("get")
            .build();

        try {
            (dispatch as ThunkDispatch<AppState, null, AnyAction>)(
                networkAction(true)
            );
            const media = await fetch.exec();
            setItem(media);
        } catch (err: any) {
            (dispatch as ThunkDispatch<AppState, null, AnyAction>)(
                setAppMessage(new AppMessage(err.message))
            );
        } finally {
            (dispatch as ThunkDispatch<AppState, null, AnyAction>)(
                networkAction(false)
            );
        }
    };

    const copyUrl = async () => {
        if (!navigator.clipboard) {
            return;
        }

        try {
            await navigator.clipboard.writeText(file!);
            (dispatch as ThunkDispatch<AppState, null, AnyAction>)(
                setAppMessage(new AppMessage(MEDIA_URL_COPIED))
            );
        } catch (e) {}
    };

    return (
        <StyledSection>
            <Grid container direction="column" spacing={1}>
                <Grid item>
                    <Typography variant="h4">{HEADER_MEDIA_PREVIEW}</Typography>
                </Grid>
                <Grid item>
                    <TextField
                        variant="outlined"
                        label={MEDIA_EDITOR_ORIGINAL_FILE_NAME_HEADER}
                        fullWidth
                        margin="normal"
                        name={MEDIA_EDITOR_ORIGINAL_FILE_NAME_HEADER}
                        value={originalFileName}
                        disabled={true}
                    />
                </Grid>
                <Grid item>
                    <TextField
                        variant="outlined"
                        label={MEDIA_FILE_TYPE}
                        fullWidth
                        margin="normal"
                        name={MEDIA_FILE_TYPE}
                        value={mimeType}
                        disabled={true}
                    />
                </Grid>
                {item.access === "public" && (
                    <Grid item>
                        <TextField
                            variant="outlined"
                            label={MEDIA_DIRECT_URL}
                            fullWidth
                            margin="normal"
                            name={MEDIA_DIRECT_URL}
                            value={file}
                            disabled={true}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={copyUrl}
                                            size="large"
                                        >
                                            <FileCopy />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>
                )}
                <Grid item>
                    {(mimeType === "image/png" ||
                        mimeType === "image/jpeg" ||
                        mimeType === "image/gif" ||
                        mimeType === "image/webp") && (
                        <div className={classes.img}>
                            <Image src={file} alt={caption} />
                        </div>
                    )}
                    {mimeType === "video/mp4" && (
                        <video
                            controls
                            controlsList="nodownload"
                            className={classes.video}
                        >
                            <source src={file} type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                    )}
                    {mimeType === "audio/mp3" && (
                        <audio controls controlsList="nodownload">
                            <source src={file} type="audio/mpeg" />
                            Your browser does not support the video tag.
                        </audio>
                    )}
                </Grid>
                {mimeType === "application/pdf" && (
                    <Grid item>
                        <a
                            href={file}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {PREVIEW_PDF_FILE}
                        </a>
                    </Grid>
                )}
            </Grid>
        </StyledSection>
    );
};

const mapStateToProps = (state: AppState) => ({
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(MediaPreview);
