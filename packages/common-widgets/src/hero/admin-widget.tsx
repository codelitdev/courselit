import React, { useEffect, useState } from "react";
import type { Address, Auth, Media, Profile } from "@courselit/common-models";
import { AppDispatch } from "@courselit/state-management";
import Settings from "./settings";
import {
    AdminWidgetPanel,
    ColorSelector,
    MediaSelector,
    Select,
    TextEditor,
} from "@courselit/components-library";
import { Form } from "@courselit/components-library";
import { FormField } from "@courselit/components-library";

interface AdminWidgetProps {
    name: string;
    settings: Settings;
    onChange: (...args: any[]) => void;
    address: Address;
    networkAction: boolean;
    dispatch: AppDispatch;
    auth: Auth;
    profile: Profile;
}

export default function AdminWidget({
    settings,
    onChange,
    dispatch,
    auth,
    profile,
    address,
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
    const [title, setTitle] = useState(settings.title || "Hero section");
    const [description, setDescription] = useState(
        settings.description || dummyDescription,
    );
    const [buttonAction, setButtonAction] = useState(settings.buttonAction);
    const [buttonCaption, setButtonCaption] = useState(settings.buttonCaption);
    const [mediaBorderRadius, setMediaBorderRadius] = useState(
        settings.mediaRadius,
    );
    const [youtubeLink, setYoutubeLink] = useState(settings.youtubeLink);
    const [alignment, setAlignment] = useState(settings.alignment || "left");
    const [backgroundColor, setBackgroundColor] = useState(
        settings.backgroundColor,
    );
    const [foregroundColor, setForegroundColor] = useState(
        settings.foregroundColor,
    );
    const [buttonBackground, setButtonBackground] = useState(
        settings.buttonBackground,
    );
    const [buttonForeground, setButtonForeground] = useState(
        settings.buttonForeground,
    );
    const [media, setMedia] = useState<Partial<Media>>(settings.media || {});
    const [style, setStyle] = useState(settings.style || "normal");

    const onSettingsChanged = () =>
        onChange({
            title,
            description,
            buttonAction,
            buttonCaption,
            youtubeLink,
            media,
            alignment,
            backgroundColor,
            foregroundColor,
            style,
            buttonBackground,
            buttonForeground,
            mediaRadius: mediaBorderRadius,
        });

    useEffect(() => {
        onSettingsChanged();
    }, [
        title,
        description,
        buttonAction,
        buttonCaption,
        youtubeLink,
        alignment,
        backgroundColor,
        foregroundColor,
        style,
        buttonBackground,
        buttonForeground,
        media,
        mediaBorderRadius,
    ]);

    return (
        <div className="flex flex-col">
            <div className="mb-4">
                <Form>
                    <AdminWidgetPanel title="Basic">
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
                    </AdminWidgetPanel>
                </Form>
            </div>
            <div className="mb-4">
                <Form>
                    <AdminWidgetPanel title="Media">
                        <FormField
                            label="YouTube Video Link"
                            value={youtubeLink}
                            onChange={(e) => setYoutubeLink(e.target.value)}
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
                        <Select
                            title="alignment"
                            value={alignment}
                            options={[
                                { label: "Left", value: "left" },
                                { label: "Right", value: "right" },
                            ]}
                            onChange={(value) => setAlignment(value)}
                        />
                    </AdminWidgetPanel>
                </Form>
            </div>
            <div className="mb-4">
                <AdminWidgetPanel title="Call to action">
                    <Form>
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
                    </Form>
                    <ColorSelector
                        title="Button color"
                        value={buttonBackground || "inherit"}
                        onChange={(value?: string) =>
                            setButtonBackground(value)
                        }
                    />
                    <ColorSelector
                        title="Button text color"
                        value={buttonForeground || "inherit"}
                        onChange={(value?: string) =>
                            setButtonForeground(value)
                        }
                    />
                </AdminWidgetPanel>
            </div>
            <div className="mb-4">
                <AdminWidgetPanel title="Design">
                    <ColorSelector
                        title="Background color"
                        value={backgroundColor || "inherit"}
                        onChange={(value?: string) => setBackgroundColor(value)}
                    />
                    <ColorSelector
                        title="Text color"
                        value={foregroundColor || "inherit"}
                        onChange={(value?: string) => setForegroundColor(value)}
                    />
                    <Select
                        title="Style"
                        value={style}
                        options={[
                            { label: "Normal", value: "normal" },
                            { label: "Card", value: "card" },
                        ]}
                        onChange={(value: "normal" | "card") => setStyle(value)}
                    />
                </AdminWidgetPanel>
            </div>
        </div>
    );
}
