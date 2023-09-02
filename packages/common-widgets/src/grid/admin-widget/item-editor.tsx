import React, { useState } from "react";
import { Item } from "../settings";
import {
    MediaSelector,
    TextEditor,
    Button,
    Form,
    FormField,
    Tooltip,
    AdminWidgetPanel,
} from "@courselit/components-library";
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
        <div className="flex flex-col">
            <Form>
                <AdminWidgetPanel title="Edit item">
                    <FormField
                        label="Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                    <div>
                        <p className="mb-1 font-medium">Description</p>
                        <TextEditor
                            initialContent={description}
                            onChange={(state: any) => setDescription(state)}
                            showToolbar={false}
                        />
                    </div>
                    <FormField
                        label="Button Text"
                        value={buttonCaption}
                        onChange={(e) => setButtonCaption(e.target.value)}
                    />
                    <FormField
                        label="Button Action"
                        value={buttonAction}
                        onChange={(e) => setButtonAction(e.target.value)}
                    />
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
                    <div className="flex justify-between">
                        <Tooltip title="Delete">
                            <Button
                                component="button"
                                onClick={onDelete}
                                variant="soft"
                            >
                                Delete
                            </Button>
                        </Tooltip>
                        <Tooltip title="Go back">
                            <Button component="button" onClick={itemChanged}>
                                Done
                            </Button>
                        </Tooltip>
                    </div>
                </AdminWidgetPanel>
            </Form>
        </div>
    );
}
