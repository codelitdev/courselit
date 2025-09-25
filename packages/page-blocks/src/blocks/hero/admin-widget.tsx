import React, { useEffect, useState } from "react";
import type {
    Address,
    Alignment,
    Media,
    Profile,
} from "@courselit/common-models";
import { Theme, ThemeStyle, SectionBackground } from "@courselit/page-models";
import Settings from "./settings";
import {
    AdminWidgetPanel,
    AdminWidgetPanelContainer,
    MediaSelector,
    Select,
    TextEditor,
    Form,
    FormField,
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
    VerticalPaddingSelector,
    MaxWidthSelector,
    SectionBackgroundPanel,
} from "@courselit/components-library";

import { isVideo } from "@courselit/utils";

interface AdminWidgetProps {
    name: string;
    settings: Settings;
    onChange: (...args: any[]) => void;
    address: Address;
    networkAction: boolean;
    profile: Profile;
    theme: Theme;
}

export default function AdminWidget({
    settings,
    onChange,
    profile,
    address,
    theme,
}: AdminWidgetProps): JSX.Element {
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

    const [media, setMedia] = useState<Partial<Media>>(settings.media || {});
    const [secondaryButtonAction, setSecondaryButtonAction] = useState(
        settings.secondaryButtonAction,
    );
    const [secondaryButtonCaption, setSecondaryButtonCaption] = useState(
        settings.secondaryButtonCaption,
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
    const [verticalPadding, setVerticalPadding] = useState<
        ThemeStyle["structure"]["section"]["padding"]["y"]
    >(settings.verticalPadding);
    const [maxWidth, setMaxWidth] = useState<
        ThemeStyle["structure"]["page"]["width"]
    >(settings.maxWidth);
    const [background, setBackground] = useState<SectionBackground>(
        settings.background,
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
            mediaRadius: mediaBorderRadius,
            verticalPadding,
            secondaryButtonAction,
            secondaryButtonCaption,
            titleFontSize,
            descriptionFontSize,
            contentAlignment,
            cssId,
            playVideoInModal,
            aspectRatio,
            objectFit,
            maxWidth,
            background,
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
        media,
        mediaBorderRadius,
        verticalPadding,
        secondaryButtonAction,
        secondaryButtonCaption,
        titleFontSize,
        descriptionFontSize,
        contentAlignment,
        cssId,
        playVideoInModal,
        aspectRatio,
        objectFit,
        maxWidth,
        background,
    ]);

    return (
        <AdminWidgetPanelContainer
            type="multiple"
            defaultValue={["basic", "media", "calls-to-action", "design"]}
        >
            <AdminWidgetPanel title="Basic" value="basic">
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
            <AdminWidgetPanel title="Media" value="media">
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
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        <PageBuilderSlider
                            title="Media border radius"
                            value={mediaBorderRadius}
                            onChange={setMediaBorderRadius}
                            min={0}
                            max={8}
                        />
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
                <Select
                    title="Aspect ratio"
                    value={aspectRatio}
                    options={[
                        { label: "16:9", value: "16/9" },
                        { label: "4:3", value: "4/3" },
                        { label: "1:1", value: "1/1" },
                        { label: "9:16", value: "9/16" },
                    ]}
                    onChange={(value: AspectRatio) => setAspectRatio(value)}
                />
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Calls to action" value="calls-to-action">
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
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Design" value="design">
                <Select
                    title="Alignment"
                    value={alignment}
                    options={[
                        { label: "Left", value: "left" },
                        { label: "Right", value: "right" },
                    ]}
                    onChange={(value: Alignment | "right") =>
                        setAlignment(value)
                    }
                />
                <Select
                    title="Content alignment"
                    value={contentAlignment}
                    options={[
                        { label: "Left", value: "left" },
                        { label: "Center", value: "center" },
                    ]}
                    onChange={(value: Alignment) => setContentAlignment(value)}
                />

                <PageBuilderSlider
                    title="Title font size"
                    value={titleFontSize}
                    onChange={setTitleFontSize}
                    min={3}
                    max={8}
                />
                {/* <PageBuilderSlider
                    title="Description font size"
                    value={descriptionFontSize}
                    onChange={setDescriptionFontSize}
                    min={0}
                    max={6}
                /> */}
                <PageBuilderSlider
                    title="Media border radius"
                    value={mediaBorderRadius}
                    min={0}
                    max={8}
                    onChange={setMediaBorderRadius}
                />
                <MaxWidthSelector
                    value={maxWidth || theme.theme.structure.page.width}
                    onChange={setMaxWidth}
                />
                <VerticalPaddingSelector
                    value={
                        verticalPadding ||
                        theme.theme.structure.section.padding.y
                    }
                    onChange={setVerticalPadding}
                />
                <SectionBackgroundPanel
                    value={background}
                    onChange={setBackground}
                    profile={profile}
                    address={address}
                />
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Advanced" value="advanced">
                <CssIdField value={cssId} onChange={setCssId} />
            </AdminWidgetPanel>
        </AdminWidgetPanelContainer>
    );
}
