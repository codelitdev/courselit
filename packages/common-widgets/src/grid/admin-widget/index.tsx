import React, { useEffect, useState } from "react";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Settings, { Item } from "../settings";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import ItemEditor from "./item-editor";
import { Address, Auth, Profile, Alignment } from "@courselit/common-models";
import { AppDispatch } from "@courselit/state-management";
import {
    AdminWidgetPanel,
    ColorSelector,
    Select,
    TextEditor,
} from "@courselit/components-library";

export interface AdminWidgetProps {
    settings: Settings;
    onChange: (...args: any[]) => void;
    address: Address;
    dispatch: AppDispatch;
    auth: Auth;
    profile: Profile;
    hideActionButtons: (
        e: boolean,
        preservedStateAcrossRerender: Record<string, unknown>
    ) => void;
    preservedStateAcrossRerender: Record<string, unknown>;
}

export default function AdminWidget({
    settings,
    onChange,
    auth,
    profile,
    dispatch,
    address,
    hideActionButtons,
    preservedStateAcrossRerender,
}: AdminWidgetProps) {
    const dummyDescription: Record<string, unknown> = {
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
            itemsAlignment,
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
        itemsAlignment,
    ]);

    const onItemChange = (newItemData: Item) => {
        items[itemBeingEditedIndex] = newItemData;
        setItems([...items]);
        setItemBeingEditedIndex(-1);
        hideActionButtons(false, {});
    };

    const onDelete = () => {
        items.splice(itemBeingEditedIndex, 1);
        setItems([...items]);
        setItemBeingEditedIndex(-1);
        hideActionButtons(false, {});
    };

    useEffect(() => {
        if (typeof preservedStateAcrossRerender.selectedItem === "number") {
            if (preservedStateAcrossRerender.selectedItem === items.length) {
                setItems([...items, dummyItem]);
            }
            setItemBeingEditedIndex(preservedStateAcrossRerender.selectedItem);
        }
    }, [preservedStateAcrossRerender]);

    const addNewItem = () => {
        hideActionButtons(true, { selectedItem: items.length });
    };

    if (itemBeingEditedIndex !== -1) {
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
            <Grid item sx={{ mb: 4 }}>
                <AdminWidgetPanel title="Header">
                    <Grid item sx={{ mb: 2 }}>
                        <TextField
                            label="Title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            fullWidth
                        />
                    </Grid>
                    <Grid item sx={{ mb: 2 }}>
                        <Typography variant="subtitle1">Description</Typography>
                        <TextEditor
                            initialContent={description}
                            onChange={(state: any) => setDescription(state)}
                            showToolbar={false}
                        />
                    </Grid>
                    <Grid item>
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
                </AdminWidgetPanel>
            </Grid>
            <Grid item sx={{ mb: 4 }}>
                <AdminWidgetPanel title="Call to action">
                    <Grid item sx={{ mb: 2 }}>
                        <TextField
                            label="Button Text"
                            value={buttonCaption}
                            onChange={(e) => setButtonCaption(e.target.value)}
                            fullWidth
                        />
                    </Grid>
                    <Grid item sx={{ mb: 2 }}>
                        <TextField
                            label="Button Action"
                            value={buttonAction}
                            onChange={(e) => setButtonAction(e.target.value)}
                            fullWidth
                        />
                    </Grid>
                    <Grid item sx={{ mb: 2 }}>
                        <ColorSelector
                            title="Button color"
                            value={buttonBackground}
                            onChange={(value: string) =>
                                setButtonBackground(value)
                            }
                        />
                    </Grid>
                    <Grid item>
                        <ColorSelector
                            title="Button text color"
                            value={buttonForeground}
                            onChange={(value: string) =>
                                setButtonForeground(value)
                            }
                        />
                    </Grid>
                </AdminWidgetPanel>
            </Grid>
            <Grid item sx={{ mb: 4 }}>
                <AdminWidgetPanel title="Items">
                    <Grid item sx={{ mb: 2 }}>
                        <List>
                            {items.map((item: Item, index: number) => (
                                <ListItem disablePadding key={index}>
                                    <ListItemButton
                                        onClick={() => {
                                            hideActionButtons(true, {
                                                selectedItem: index,
                                            });
                                        }}
                                    >
                                        <ListItemText primary={item.title} />
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    </Grid>
                    <Grid item sx={{ mb: 2 }}>
                        <Button onClick={addNewItem}>Add new item</Button>
                    </Grid>
                    <Grid item>
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
                </AdminWidgetPanel>
            </Grid>
            <Grid item sx={{ mb: 4 }}>
                <AdminWidgetPanel title="Design">
                    <Grid item sx={{ mb: 2 }}>
                        <ColorSelector
                            title="Background color"
                            value={backgroundColor}
                            onChange={(value: string) =>
                                setBackgroundColor(value)
                            }
                        />
                    </Grid>
                    <Grid item>
                        <ColorSelector
                            title="Text color"
                            value={foregroundColor}
                            onChange={(value: string) =>
                                setForegroundColor(value)
                            }
                        />
                    </Grid>
                </AdminWidgetPanel>
            </Grid>
        </Grid>
    );
}
