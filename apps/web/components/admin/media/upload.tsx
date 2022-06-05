import React, { useState, createRef, useEffect } from "react";
import { styled } from "@mui/material/styles";
import { Button, Grid, TextField, Typography, Checkbox } from "@mui/material";
import { connect } from "react-redux";
import { Section } from "@courselit/components-library";
import {
    BUTTON_ADD_FILE,
    MEDIA_UPLOAD_BUTTON_TEXT,
    MEDIA_UPLOADING,
    MEDIA_PUBLIC,
} from "../../../ui-config/strings";
import { AppMessage } from "@courselit/common-models";
import type { Auth, Address } from "@courselit/common-models";
import { FetchBuilder } from "@courselit/utils";
import type { AppDispatch, AppState } from "@courselit/state-management";
import { actionCreators } from "@courselit/state-management";
import { responses } from "../../../config/strings";

const { networkAction, setAppMessage } = actionCreators;

const PREFIX = "Upload";

const classes = {
    fileUploadInput: `${PREFIX}-fileUploadInput`,
};

const StyledSection = styled(Section)({
    [`& .${classes.fileUploadInput}`]: {
        display: "none",
    },
});

interface UploadProps {
    auth: Auth;
    address: Address;
    dispatch: AppDispatch;
    resetOverview: any;
}

function Upload({ auth, address, dispatch, resetOverview }: UploadProps) {
    const defaultUploadData = {
        caption: "",
        uploading: false,
        public: false,
    };
    const [uploadData, setUploadData] = useState(defaultUploadData);
    const fileInput = createRef();
    const [uploading, setUploading] = useState(false);
    const [presignedUrl, setPresignedUrl] = useState("");

    const onUploadDataChanged = (e: any) =>
        setUploadData(
            Object.assign({}, uploadData, {
                [e.target.name]:
                    e.target.type === "checkbox"
                        ? e.target.checked
                        : e.target.value,
            })
        );

    // const uploadToLocalDisk = async () => {
    //   const fD = new window.FormData();
    //   fD.append("title", uploadData.title);
    //   fD.append("caption", uploadData.caption);
    //   fD.append("file", fileInput.current.files[0]);

    //   setUploadData(
    //     Object.assign({}, uploadData, {
    //       uploading: true,
    //     })
    //   );

    //   try {
    //     setUploading(true);

    //     let res = await fetch(`${address.backend}/media`, {
    //       method: "POST",
    //       headers: {
    //         Authorization: `Bearer ${auth.token}`,
    //       },
    //       body: fD,
    //     });
    //     res = await res.json();

    //     if (res.media) {
    //       setUploadData(defaultUploadData);
    //       dispatch(setAppMessage(new AppMessage(FILE_UPLOAD_SUCCESS)));
    //       resetOverview();
    //     } else {
    //       dispatch(setAppMessage(new AppMessage(res.message)));
    //     }
    //   } catch (err) {
    //     dispatch(setAppMessage(new AppMessage(err.message)));
    //   } finally {
    //     setUploading(false);
    //   }
    // };
    useEffect(() => {
        getPresignedUrl();
    }, []);

    const getPresignedUrl = async () => {
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/media/presigned`)
            .setIsGraphQLEndpoint(false)
            .build();
        try {
            dispatch(networkAction(true));
            const response = await fetch.exec();
            setPresignedUrl(response.url);
        } catch (err: any) {
            dispatch(
                setAppMessage(new AppMessage(responses.presigned_url_failed))
            );
        } finally {
            dispatch(networkAction(false));
        }
    };

    const onUpload = async (e) => {
        e.preventDefault();
        await uploadToServer();
    };

    const uploadToServer = async () => {
        const fD = new FormData();
        fD.append("caption", uploadData.caption);
        fD.append("access", uploadData.public ? "public" : "private");
        fD.append("file", (fileInput as any).current.files[0]);

        setUploadData(
            Object.assign({}, uploadData, {
                uploading: true,
            })
        );

        try {
            setUploading(true);

            let res: any = await fetch(presignedUrl, {
                method: "POST",
                body: fD,
            });
            if (res.status === 200) {
                dispatch(
                    setAppMessage(new AppMessage(responses.file_uploaded))
                );
                resetForm();
                resetOverview();
            } else {
                res = await res.json();
                throw new Error(res.error);
            }
        } catch (err) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            setUploading(false);
        }
    };

    const resetForm = () => {
        setPresignedUrl("");
    };

    return (
        <StyledSection>
            <form onSubmit={onUpload} encType="multipart/form-data">
                <Button variant="outlined" component="label" color="primary">
                    {BUTTON_ADD_FILE}
                    <input
                        type="file"
                        name="file"
                        ref={fileInput}
                        className={classes.fileUploadInput}
                    />
                </Button>
                <TextField
                    variant="outlined"
                    label="Alt text"
                    fullWidth
                    margin="normal"
                    name="caption"
                    value={uploadData.caption}
                    onChange={onUploadDataChanged}
                />
                <Grid container alignItems="center">
                    <Grid item>
                        <Typography variant="body1">{MEDIA_PUBLIC}</Typography>
                    </Grid>
                    <Grid item>
                        <Checkbox
                            name="public"
                            onChange={onUploadDataChanged}
                        />
                    </Grid>
                </Grid>
                <Button
                    type="submit"
                    disabled={uploading || !presignedUrl}
                    variant="outlined"
                >
                    {uploading ? MEDIA_UPLOADING : MEDIA_UPLOAD_BUTTON_TEXT}
                </Button>
            </form>
        </StyledSection>
    );
}

const mapStateToProps = (state: AppState) => ({
    address: state.address,
    auth: state.auth,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(Upload);
