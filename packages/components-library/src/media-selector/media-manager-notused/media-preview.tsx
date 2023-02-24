import * as React from "react";
import { styled } from "@mui/material/styles";
import {
    Grid,
    Typography,
    TextField,
    IconButton,
    InputAdornment,
} from "@mui/material";
import { FileCopy } from "@mui/icons-material";
import { AppMessage } from "@courselit/common-models";
import type { AppDispatch, AppState } from "@courselit/state-management";
import type { Address, Media } from "@courselit/common-models";
import { FetchBuilder } from "@courselit/utils";
import { actionCreators } from "@courselit/state-management";
import Section from "../../section";
import Image from "../../image";
import { AnyAction } from "redux";
import { ThunkDispatch } from "redux-thunk";

const { useEffect, useState } = React;
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

interface Strings {
    headerMediaPreview?: string;
    originalFileNameHeader?: string;
    previewPDFFile?: string;
    directUrl?: string;
    urlCopied?: string;
    fileType?: string;
}

interface MediaPreviewProps {
    item: Media;
    address: Address;
    dispatch: AppDispatch;
    strings: Strings;
}

const MediaPreview = (props: MediaPreviewProps) => {
    const [item, setItem] = useState(props.item);
    const { dispatch, address, strings } = props;
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
                setAppMessage(
                    new AppMessage(strings.urlCopied || "Copied to clipboard")
                )
            );
        } catch (e) {}
    };

    return (
        <StyledSection>
            <Grid container direction="column" spacing={1}>
                <Grid item>
                    <Typography variant="h4">
                        {strings.headerMediaPreview || "Preview"}
                    </Typography>
                </Grid>
                <Grid item>
                    <TextField
                        variant="outlined"
                        label={strings.originalFileNameHeader || "File Name"}
                        fullWidth
                        margin="normal"
                        name={strings.originalFileNameHeader || "File Name"}
                        value={originalFileName}
                        disabled={true}
                    />
                </Grid>
                <Grid item>
                    <TextField
                        variant="outlined"
                        label={strings.fileType || "File type"}
                        fullWidth
                        margin="normal"
                        name={strings.fileType || "File type"}
                        value={mimeType}
                        disabled={true}
                    />
                </Grid>
                {item.access === "public" && (
                    <Grid item>
                        <TextField
                            variant="outlined"
                            label={strings.directUrl || "Direct URL"}
                            fullWidth
                            margin="normal"
                            name={strings.directUrl || "Direct URL"}
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
                            controlsList="nodownload" // eslint-disable-line react/no-unknown-property
                            className={classes.video}
                        >
                            <source src={file} type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                    )}
                    {mimeType === "audio/mp3" && (
                        <audio
                            controls
                            controlsList="nodownload" // eslint-disable-line react/no-unknown-property
                        >
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
                            {strings.previewPDFFile || "Preview in a new tab"}
                        </a>
                    </Grid>
                )}
            </Grid>
        </StyledSection>
    );
};

export default MediaPreview;
