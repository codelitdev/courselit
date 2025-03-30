"use client";

import { useEffect, useState } from "react";
import type { Address, Media, Profile } from "@courselit/common-models";
import Settings from "./settings";
import {
    AdminWidgetPanel,
    ColorSelector,
    MediaSelector,
    Form,
    FormField,
    ContentPaddingSelector,
    PageBuilderPropertyHeader,
    PageBuilderSlider,
    CssIdField,
    Checkbox,
    AspectRatio,
    ImageObjectFit,
    Select,
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
    const [mediaBorderRadius, setMediaBorderRadius] = useState(
        settings.mediaRadius || 2,
    );
    const [youtubeLink, setYoutubeLink] = useState(settings.youtubeLink);
    const [backgroundColor, setBackgroundColor] = useState(
        settings.backgroundColor,
    );
    const [media, setMedia] = useState<Partial<Media>>(settings.media || {});
    const [horizontalPadding, setHorizontalPadding] = useState<number>(
        settings.horizontalPadding || defaultHorizontalPadding,
    );
    const [verticalPadding, setVerticalPadding] = useState<number>(
        settings.verticalPadding || defaultVerticalPadding,
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
            youtubeLink,
            media,
            backgroundColor,
            mediaRadius: mediaBorderRadius,
            horizontalPadding,
            verticalPadding,
            cssId,
            playVideoInModal,
            aspectRatio,
            objectFit,
        });

    useEffect(() => {
        onSettingsChanged();
    }, [
        youtubeLink,
        backgroundColor,
        media,
        mediaBorderRadius,
        horizontalPadding,
        verticalPadding,
        cssId,
        playVideoInModal,
        aspectRatio,
        objectFit,
    ]);

    return (
        <div className="flex flex-col gap-4 mb-4">
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
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Design">
                <ColorSelector
                    title="Background color"
                    value={backgroundColor || "inherit"}
                    onChange={(value?: string) => setBackgroundColor(value)}
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
