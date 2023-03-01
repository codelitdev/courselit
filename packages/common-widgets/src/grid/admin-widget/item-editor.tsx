import React, { useState } from "react";
import Grid from "@mui/material/Grid";
import { Item } from "../settings";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import { MediaSelector, TextEditor } from "@courselit/components-library";
import { Address, Auth, Media, Profile } from "@courselit/common-models";
import { AppDispatch } from "@courselit/state-management";
import ArrowBack from "@mui/icons-material/ArrowBack";
import Delete from "@mui/icons-material/Delete";

interface ItemProps {
    item: Item;
    index: number;
    onChange: (newItemData: Item) => void;
    onDelete: () => void;
    address: Address;
    dispatch: AppDispatch;
    auth: Auth;
    profile: Profile;
}

export default function ItemEditor({
    item,
    index,
    onChange,
    onDelete,
    address,
    dispatch,
    auth,
    profile,
}: ItemProps) {
    const [title, setTitle] = useState(item.title);
    const [description, setDescription] = useState(item.description);
    const [buttonCaption, setButtonCaption] = useState(item.buttonCaption);
    const [buttonAction, setButtonAction] = useState(item.buttonAction);
    const [media, setMedia] = useState<Media>(item.media);

    const itemChanged = () =>
        onChange({
            title,
            description,
            buttonCaption,
            buttonAction,
            media,
        });

    return (
        <Grid container direction="column" sx={{ mb: 12 }}>
            <Grid item sx={{ mb: 2 }}>
                <Grid container justifyContent="space-between">
                    <Grid item>
                        <Tooltip title="Go back">
                            <IconButton
                                aria-label="go back"
                                size="small"
                                onClick={itemChanged}
                            >
                                <ArrowBack fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Grid>
                    <Grid item>
                        <Tooltip title="Delete">
                            <IconButton
                                aria-label="delete"
                                size="small"
                                onClick={onDelete}
                            >
                                <Delete fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Grid>
                </Grid>
            </Grid>
            <Grid item>
                <TextField
                    label="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    fullWidth
                    size="small"
                />
            </Grid>
            <Grid item sx={{ mb: 2 }}>
                <TextEditor
                    initialContent={description}
                    onChange={(state: any) => setDescription(state)}
                    showToolbar={false}
                />
            </Grid>
            <Grid item>
                <TextField
                    label="Button Text"
                    value={buttonCaption}
                    onChange={(e) => setButtonCaption(e.target.value)}
                    fullWidth
                    sx={{ mb: 2 }}
                    size="small"
                />
            </Grid>
            <Grid item>
                <TextField
                    label="Button Action"
                    value={buttonAction}
                    onChange={(e) => setButtonAction(e.target.value)}
                    fullWidth
                    sx={{ mb: 2 }}
                    size="small"
                />
            </Grid>
            <Grid item>
                <MediaSelector
                    title=""
                    src={media && media.thumbnail}
                    srcTitle={media && media.originalFileName}
                    dispatch={dispatch}
                    auth={auth}
                    profile={profile}
                    address={address}
                    onSelection={(media: Media) => {
                        if (media) {
                            setMedia(media);
                        }
                    }}
                    strings={{}}
                    access="public"
                />
            </Grid>
        </Grid>
    );
}