import React from "react";
import { WidgetProps } from "@courselit/common-models";
import Settings from "./settings";
import { Image, VideoWithPreview } from "@courselit/components-library";
import {
    verticalPadding as defaultVerticalPadding,
    horizontalPadding as defaultHorizontalPadding,
} from "./defaults";
import { isVideo } from "@courselit/utils";

const twRoundedMap = {
    "0": "rounded-none",
    "1": "rounded-sm",
    "2": "rounded",
    "3": "rounded-md",
    "4": "rounded-lg",
    "5": "rounded-xl",
    "6": "rounded-2xl",
    "7": "rounded-3xl",
    "8": "rounded-full",
};

export default function Widget({
    settings: {
        media,
        youtubeLink,
        backgroundColor,
        mediaRadius = 0,
        horizontalPadding = defaultHorizontalPadding,
        verticalPadding = defaultVerticalPadding,
        cssId,
        playVideoInModal,
        aspectRatio,
        objectFit,
    },
}: WidgetProps<Settings>) {
    const hasHeroGraphic = youtubeLink || (media && media.mediaId);

    return (
        <section
            className={`py-[${verticalPadding}px]`}
            style={{
                backgroundColor,
            }}
            id={cssId}
        >
            <div className="mx-auto lg:max-w-[1200px]">
                <div
                    className={`flex flex-col px-4 w-full mx-auto lg:max-w-[${horizontalPadding}%] gap-4`}
                >
                    {hasHeroGraphic && (
                        <div>
                            <div
                                className={`w-full text-center overflow-hidden ${twRoundedMap[mediaRadius]}`}
                                style={{
                                    width: "100%",
                                }}
                            >
                                {isVideo(youtubeLink, media) ? (
                                    <VideoWithPreview
                                        videoUrl={
                                            youtubeLink || media?.file || ""
                                        }
                                        aspectRatio={aspectRatio}
                                        title={media?.caption || ""}
                                        thumbnailUrl={media?.thumbnail || ""}
                                        modal={playVideoInModal}
                                    />
                                ) : (
                                    <Image
                                        src={media?.file || ""}
                                        alt={media?.caption || ""}
                                        borderRadius={mediaRadius}
                                        objectFit={objectFit}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                    {!hasHeroGraphic && (
                        <div
                            className={`w-full text-center overflow-hidden ${twRoundedMap[mediaRadius]}`}
                            style={{
                                width: "100%",
                            }}
                        >
                            <Image src="" borderRadius={0} />
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
