import React, { useEffect, useState } from "react";
import type {
    Address,
    Alignment,
    Auth,
    Media,
    Profile,
} from "@courselit/common-models";
import { AppDispatch } from "@courselit/state-management";
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
} from "@courselit/components-library";

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
    const [mediaBorderRadius, setMediaBorderRadius] = useState(
        settings.mediaRadius || 2,
    );
    const [youtubeLink, setYoutubeLink] = useState(settings.youtubeLink);
    const [backgroundColor, setBackgroundColor] = useState(
        settings.backgroundColor,
    );
    const [media, setMedia] = useState<Partial<Media>>(settings.media || {});
    const [horizontalPadding, setHorizontalPadding] = useState<number>(
        settings.horizontalPadding || 100,
    );
    const [verticalPadding, setVerticalPadding] = useState<number>(
        settings.verticalPadding || 16,
    );

    const onSettingsChanged = () =>
        onChange({
            youtubeLink,
            media,
            backgroundColor,
            mediaRadius: mediaBorderRadius,
            horizontalPadding,
            verticalPadding,
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
    ]);

    return (
        <div className="flex flex-col gap-4 mb-4">
            <AdminWidgetPanel title="Media">
                <Form>
                    <FormField
                        label="YouTube Video Link"
                        placeholder="Just enter the video id after ?v= in the URL"
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
                    dispatch={dispatch}
                    auth={auth}
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
                />
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
        </div>
    );
}
