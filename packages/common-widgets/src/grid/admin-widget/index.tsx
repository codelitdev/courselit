import React, { useEffect, useState } from "react";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Settings, { Alignment, Item } from "../settings";
import { TextEditor } from "@courselit/components-library";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import ItemEditor from "./item-editor";
import { Address, Auth, Profile } from "@courselit/common-models";
import { AppDispatch } from "@courselit/state-management";
import { Select } from "@courselit/components-library";

interface AdminWidgetProps {
    settings: Settings;
    onChange: (...args: any[]) => void;
    address: Address;
    dispatch: AppDispatch;
    auth: Auth;
    profile: Profile;
}

export default function AdminWidget({
    settings,
    onChange,
    auth,
    profile,
    dispatch,
    address,
}: AdminWidgetProps) {
    const dummyDescription: Record<string, unknown> = {
        type: "doc",
        content: [
            {
                type: "paragraph",
                content: [{ type: "text", text: "The details will go here." }],
            },
        ],
    };
    const dummyItemDescription: Record<string, unknown> = {
        type: "doc",
        content: [
            {
                type: "paragraph",
                content: [
                    {
                        type: "text",
                        text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
                    },
                ],
            },
        ],
    };
    const dummyItem: Item = {
        title: "Item",
        description: dummyItemDescription,
    };
    const [title, setTitle] = useState(settings.title || "Grid");
    const [description, setDescription] = useState(
        settings.description || dummyDescription
    );
    const [buttonAction, setButtonAction] = useState(settings.buttonAction);
    const [buttonCaption, setButtonCaption] = useState(settings.buttonCaption);
    const [backgroundColor, setBackgroundColor] = useState(
        settings.backgroundColor
    );
    const [foregroundColor, setForegroundColor] = useState(
        settings.foregroundColor
    );
    const [buttonBackground, setButtonBackground] = useState(
        settings.buttonBackground
    );
    const [buttonForeground, setButtonForeground] = useState(
        settings.buttonForeground
    );
    const [items, setItems] = useState<Item[]>(
        settings.items || [dummyItem, dummyItem, dummyItem]
    );
    const [headerAlignment, setHeaderAlignment] = useState<Alignment>(
        settings.headerAlignment || "center"
    );
    const [itemsAlignment, setItemsAlignment] = useState<Alignment>(
        settings.itemsAlignment || "center"
    );
    const [itemEditorOpened, setItemEditorOpened] = useState(false);
    const [itemBeingEditedIndex, setItemBeingEditedIndex] = useState(-1);

    const onSettingsChanged = () =>
        onChange({
            title,
            description,
            headerAlignment,
            buttonAction,
            buttonCaption,
            backgroundColor,
            foregroundColor,
            buttonBackground,
            buttonForeground,
            items,
            itemsAlignment
        });

    useEffect(() => {
        onSettingsChanged();
    }, [
        title,
        description,
        headerAlignment,
        buttonAction,
        buttonCaption,
        backgroundColor,
        foregroundColor,
        buttonBackground,
        buttonForeground,
        items,
        itemsAlignment
    ]);

    const onItemChange = (newItemData: Item) => {
        items[itemBeingEditedIndex] = newItemData;
        setItems([...items]);
        setItemEditorOpened(false);
    };

    const onDelete = () => {
        items.splice(itemBeingEditedIndex, 1);
        setItems([...items]);
        setItemEditorOpened(false);
    };

    const addNewItem = () => {
        setItemBeingEditedIndex(items.length);
        setItemEditorOpened(true);
        setItems([...items, dummyItem]);
    };

    if (itemEditorOpened) {
        return (
            <ItemEditor
                item={items[itemBeingEditedIndex]}
                index={itemBeingEditedIndex}
                onChange={onItemChange}
                onDelete={onDelete}
                auth={auth}
                profile={profile}
                dispatch={dispatch}
                address={address}
            />
        );
    }

    return (
        <Grid container direction="column">
            <Grid item>
                <TextField
                    label="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    fullWidth
                />
            </Grid>
            <Grid item sx={{ mb: 2 }}>
                <Typography variant="subtitle1" sx={{ mt: 2 }}>
                    Description
                </Typography>
                <TextEditor
                    initialContent={description}
                    onChange={(state: any) => setDescription(state)}
                    showToolbar={false}
                />
            </Grid>
            <Grid item xs={12} sx={{ mb: 2 }}>
                <Grid container justifyContent="space-between">
                    <Grid item>
                        <Typography variant="subtitle1">
                            Background color
                        </Typography>
                    </Grid>
                    <Grid item>
                        <input
                            type="color"
                            value={backgroundColor}
                            onChange={(e) => setBackgroundColor(e.target.value)}
                        />
                    </Grid>
                </Grid>
            </Grid>
            <Grid item xs={12} sx={{ mb: 2 }}>
                <Grid container justifyContent="space-between">
                    <Grid item>
                        <Typography variant="subtitle1">Text color</Typography>
                    </Grid>
                    <Grid item>
                        <input
                            type="color"
                            value={foregroundColor}
                            onChange={(e) => setForegroundColor(e.target.value)}
                        />
                    </Grid>
                </Grid>
            </Grid>
            <Grid item sx={{ mb: 4 }}>
                <Select
                    title="Header alignment"
                    value={headerAlignment}
                    options={[
                        { label: "Left", value: "left" },
                        { label: "Center", value: "center" },
                    ]}
                    onChange={(value: Alignment) =>
                        setHeaderAlignment(value)
                    }
                />
            </Grid>
            <Grid item sx={{ mb: 4 }}>
                <Grid container direction="column">
                    <Grid item sx={{ mb: 2 }}>
                        <Typography
                            variant="overline"
                            color="textSecondary"
                            sx={{ fontWeight: "bold" }}
                        >
                            Call to action
                        </Typography>
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
                    <Grid item>
                        <Grid
                            container
                            justifyContent="space-between"
                            sx={{ mb: 2 }}
                        >
                            <Grid item>
                                <Typography variant="subtitle1">
                                    Button color
                                </Typography>
                            </Grid>
                            <Grid item>
                                <input
                                    type="color"
                                    value={buttonBackground}
                                    onChange={(e) =>
                                        setButtonBackground(e.target.value)
                                    }
                                />
                            </Grid>
                        </Grid>
                    </Grid>
                    <Grid item>
                        <Grid container justifyContent="space-between">
                            <Grid item>
                                <Typography variant="subtitle1">
                                    Button text color
                                </Typography>
                            </Grid>
                            <Grid item>
                                <input
                                    type="color"
                                    value={buttonForeground}
                                    onChange={(e) =>
                                        setButtonForeground(e.target.value)
                                    }
                                />
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
            <Grid item sx={{ mb: 2 }}>
                <Grid container direction="column">
                    <Grid item>
                        <Typography
                            variant="overline"
                            color="textSecondary"
                            sx={{ fontWeight: "bold" }}
                        >
                            Items
                        </Typography>
                    </Grid>
                    <Grid item>
                        <List>
                            {items.map((item: Item, index: number) => (
                                <ListItem disablePadding>
                                    <ListItemButton
                                        onClick={() => {
                                            setItemBeingEditedIndex(index);
                                            setItemEditorOpened(true);
                                        }}
                                    >
                                        <ListItemText primary={item.title} />
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    </Grid>
                    <Grid item>
                        <Button onClick={addNewItem}>Add new item</Button>
                    </Grid>
                </Grid>
            </Grid>
            <Grid item sx={{ mb: 4 }}>
                <Select
                    title="Items alignment"
                    value={itemsAlignment}
                    options={[
                        { label: "Left", value: "left" },
                        { label: "Center", value: "center" },
                    ]}
                    onChange={(value: Alignment) =>
                        setItemsAlignment(value)
                    }
                />
            </Grid>
        </Grid>
    );
}
