import React, { useState } from "react";
import Grid from "@mui/material/Grid";
import { Item } from "../settings";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import { MediaSelector, TextEditor } from "@courselit/components-library";
import { Address, Auth, Media, Profile } from "@courselit/common-models";
import { AppDispatch } from "@courselit/state-management";

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
            <Grid item>
                <TextField
                    label="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    fullWidth
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
                />
            </Grid>
            <Grid item>
                <TextField
                    label="Button Action"
                    value={buttonAction}
                    onChange={(e) => setButtonAction(e.target.value)}
                    fullWidth
                    sx={{ mb: 2 }}
                />
            </Grid>
            <Grid item sx={{ mb: 4 }}>
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
            <Grid item>
                <Grid container justifyContent="space-between">
                    <Grid item>
                        <Tooltip title="Delete">
                            <Button
                                aria-label="delete"
                                color="error"
                                onClick={onDelete}
                            >
                                Delete
                            </Button>
                        </Tooltip>
                    </Grid>
                    <Grid item>
                        <Tooltip title="Go back">
                            <Button aria-label="done" onClick={itemChanged}>
                                Done
                            </Button>
                        </Tooltip>
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    );
}
