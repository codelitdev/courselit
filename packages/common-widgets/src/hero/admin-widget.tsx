"use client";

import React, { useEffect, useState } from "react";
import type {
    Address,
    Alignment,
    Media,
    Profile,
} from "@courselit/common-models";
import Settings from "./settings";
import {
    AdminWidgetPanel,
    ColorSelector,
    MediaSelector,
    Select,
    TextEditor,
    Form,
    FormField,
    ContentPaddingSelector,
    Accordion,
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
    PageBuilderSlider,
    PageBuilderPropertyHeader,
    CssIdField,
    AspectRatio,
    ImageObjectFit,
    Checkbox,
} from "@courselit/components-library";
import {
    verticalPadding as defaultVerticalPadding,
    horizontalPadding as defaultHorizontalPadding,
} from "./defaults";
import { isVideo } from "@courselit/utils";

interface AdminWidgetProps {
    name: string;
    settings: Settings;
    onChange: (...args: any[]) => void;
    address: Address;
    networkAction: boolean;
    profile: Profile;
}

export default function AdminWidget({
    settings,
    onChange,
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
        settings.mediaRadius || 2,
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
    const [horizontalPadding, setHorizontalPadding] = useState<number>(
        settings.horizontalPadding || defaultHorizontalPadding,
    );
    const [verticalPadding, setVerticalPadding] = useState<number>(
        settings.verticalPadding || defaultVerticalPadding,
    );
    const [secondaryButtonAction, setSecondaryButtonAction] = useState(
        settings.secondaryButtonAction,
    );
    const [secondaryButtonCaption, setSecondaryButtonCaption] = useState(
        settings.secondaryButtonCaption,
    );
    const [secondaryButtonBackground, setSecondaryButtonBackground] = useState(
        settings.secondaryButtonBackground,
    );
    const [secondaryButtonForeground, setSecondaryButtonForeground] = useState(
        settings.secondaryButtonForeground,
    );
    const [titleFontSize, setTitleFontSize] = useState(
        settings.titleFontSize || 4,
    );
    const [descriptionFontSize, setDescriptionFontSize] = useState(
        settings.descriptionFontSize || 0,
    );
    const [contentAlignment, setContentAlignment] = useState<Alignment>(
        settings.contentAlignment || "center",
    );
    const [cssId, setCssId] = useState(settings.cssId);
    const [playVideoInModal, setPlayVideoInModal] = useState(
        settings.playVideoInModal || false,
    );
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>(
        settings.aspectRatio || "16/9",
    );
    const [objectFit, setObjectFit] = useState<ImageObjectFit>(
        settings.objectFit || "cover",
    );

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
            horizontalPadding,
            verticalPadding,
            secondaryButtonAction,
            secondaryButtonCaption,
            secondaryButtonBackground,
            secondaryButtonForeground,
            titleFontSize,
            descriptionFontSize,
            contentAlignment,
            cssId,
            playVideoInModal,
            aspectRatio,
            objectFit,
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
        horizontalPadding,
        verticalPadding,
        secondaryButtonAction,
        secondaryButtonCaption,
        secondaryButtonBackground,
        secondaryButtonForeground,
        titleFontSize,
        descriptionFontSize,
        contentAlignment,
        cssId,
        playVideoInModal,
        aspectRatio,
        objectFit,
    ]);

    return (
        <div className="flex flex-col gap-4 mb-4">
            <AdminWidgetPanel title="Basic">
                <Form>
                    <FormField
                        label="Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </Form>
                <div>
                    <p className="mb-1 font-medium">Description</p>
                    <TextEditor
                        initialContent={description}
                        onChange={(state: any) => setDescription(state)}
                        showToolbar={false}
                        url={address.backend}
                    />
                </div>
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Media">
                <Form>
                    <FormField
                        label="YouTube/Vimeo Link"
                        placeholder="Enter the link to the video"
                        value={youtubeLink}
                        onChange={(e) => setYoutubeLink(e.target.value)}
                    />
                </Form>
                <PageBuilderPropertyHeader
                    label="Upload media"
                    tooltip="This will be overridden if you have provided a YouTube video id above"
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
                    onRemove={() => {
                        setMedia({});
                    }}
                    strings={{}}
                    access="public"
                    mediaId={media && media.mediaId}
                    type="page"
                />
                {isVideo(youtubeLink, media) ? (
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between mt-2">
                            <div className="flex grow items-center gap-1">
                                <p>Play video in a pop-up</p>
                            </div>
                            <Checkbox
                                checked={playVideoInModal}
                                onChange={(value: boolean) =>
                                    setPlayVideoInModal(value)
                                }
                            />
                        </div>
                        <Select
                            title="Aspect ratio"
                            value={aspectRatio}
                            options={[
                                { label: "16/9", value: "16/9" },
                                { label: "4/3", value: "4/3" },
                                { label: "1/1", value: "1/1" },
                                { label: "9/16", value: "9/16" },
                            ]}
                            onChange={(value: AspectRatio) =>
                                setAspectRatio(value)
                            }
                        />
                    </div>
                ) : (
                    <div>
                        <Select
                            title="Object fit"
                            value={objectFit}
                            options={[
                                { label: "Cover", value: "cover" },
                                { label: "Contain", value: "contain" },
                                { label: "Fill", value: "fill" },
                                { label: "None", value: "none" },
                                { label: "Scale-down", value: "scale-down" },
                            ]}
                            onChange={(value: ImageObjectFit) =>
                                setObjectFit(value)
                            }
                        />
                    </div>
                )}
                {/* {media && media.mediaId && (
                    <Select
                        title="Media aspect ratio"
                        value={mediaAspectRatio}
                        options={[
                            {
                                label: "16:9 (rectangle)",
                                value: "aspect-video",
                            },
                            { label: "1:1 (square)", value: "aspect-square" },
                            { label: "Auto", value: "aspect-auto" },
                        ]}
                        onChange={(value: MediaAspectRatio) =>
                            setMediaAspectRatio(value)
                        }
                    />
                )} */}
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Calls to action">
                <Accordion type="single" collapsible>
                    <AccordionItem value="primary">
                        <AccordionTrigger>Primary button</AccordionTrigger>
                        <AccordionContent className="flex flex-col gap-4">
                            <Form className="flex flex-col gap-4">
                                <FormField
                                    label="Button Text"
                                    value={buttonCaption}
                                    onChange={(e) =>
                                        setButtonCaption(e.target.value)
                                    }
                                />
                                <FormField
                                    label="Button Action"
                                    value={buttonAction}
                                    onChange={(e) =>
                                        setButtonAction(e.target.value)
                                    }
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
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="secondary">
                        <AccordionTrigger>Secondary button</AccordionTrigger>
                        <AccordionContent className="flex flex-col gap-4">
                            <Form className="flex flex-col gap-4">
                                <FormField
                                    label="Button Text"
                                    value={secondaryButtonCaption}
                                    onChange={(e) =>
                                        setSecondaryButtonCaption(
                                            e.target.value,
                                        )
                                    }
                                />
                                <FormField
                                    label="Button Action"
                                    value={secondaryButtonAction}
                                    onChange={(e) =>
                                        setSecondaryButtonAction(e.target.value)
                                    }
                                />
                            </Form>
                            <ColorSelector
                                title="Button color"
                                value={secondaryButtonBackground || "inherit"}
                                onChange={(value?: string) =>
                                    setSecondaryButtonBackground(value)
                                }
                            />
                            <ColorSelector
                                title="Button text color"
                                value={secondaryButtonForeground || "inherit"}
                                onChange={(value?: string) =>
                                    setSecondaryButtonForeground(value)
                                }
                            />
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Design">
                <Select
                    title="Content alignment"
                    value={contentAlignment}
                    options={[
                        { label: "Left", value: "left" },
                        { label: "Center", value: "center" },
                    ]}
                    onChange={(value: Alignment) => setContentAlignment(value)}
                />
                <Select
                    title="Media alignment"
                    value={alignment}
                    options={[
                        { label: "Left", value: "left" },
                        { label: "Right", value: "right" },
                    ]}
                    onChange={(value) => setAlignment(value)}
                />
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
                <ContentPaddingSelector
                    value={horizontalPadding}
                    min={50}
                    onChange={setHorizontalPadding}
                />
                <ContentPaddingSelector
                    variant="vertical"
                    value={verticalPadding}
                    onChange={setVerticalPadding}
                />
                <PageBuilderSlider
                    title="Title font size"
                    min={4}
                    max={8}
                    value={titleFontSize}
                    onChange={setTitleFontSize}
                />
                <PageBuilderSlider
                    title="Description font size"
                    min={0}
                    max={6}
                    value={descriptionFontSize}
                    onChange={setDescriptionFontSize}
                />
                <PageBuilderSlider
                    title="Media border radius"
                    value={mediaBorderRadius}
                    min={0}
                    max={8}
                    onChange={setMediaBorderRadius}
                />
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Advanced">
                <CssIdField value={cssId} onChange={setCssId} />
            </AdminWidgetPanel>
        </div>
    );
}
