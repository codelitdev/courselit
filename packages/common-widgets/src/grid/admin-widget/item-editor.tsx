"use client";

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
    Select,
} from "@courselit/components-library";
import {
    Address,
    Media,
    Profile,
    VerticalAlignment,
} from "@courselit/common-models";

interface ItemProps {
    item: Item;
    index: number;
    onChange: (newItemData: Item) => void;
    onDelete: () => void;
    address: Address;
    profile: Profile;
}

export default function ItemEditor({
    item,
    onChange,
    onDelete,
    address,
    profile,
}: ItemProps) {
    const [title, setTitle] = useState(item.title);
    const [description, setDescription] = useState(item.description);
    const [buttonCaption, setButtonCaption] = useState(item.buttonCaption);
    const [buttonAction, setButtonAction] = useState(item.buttonAction);
    const [media, setMedia] = useState<Partial<Media>>(item.media);
    const [mediaAlignment, setMediaAlignment] = useState<VerticalAlignment>(
        item.mediaAlignment || "bottom",
    );

    const itemChanged = () =>
        onChange({
            title,
            description,
            buttonCaption,
            buttonAction,
            media,
            mediaAlignment,
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
                            url={address.backend}
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
                        profile={profile}
                        address={address}
                        onSelection={(media: Media) => {
                            if (media) {
                                setMedia(media);
                            }
                        }}
                        strings={{}}
                        access="public"
                        mediaId={media?.mediaId}
                        onRemove={() => {
                            setMedia({});
                        }}
                        type="page"
                    />
                    <Select
                        title="Media alignment"
                        value={mediaAlignment}
                        options={[
                            { label: "Above title", value: "top" },
                            { label: "Below title", value: "bottom" },
                        ]}
                        onChange={(value: VerticalAlignment) =>
                            setMediaAlignment(value)
                        }
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
