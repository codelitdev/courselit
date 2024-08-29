import React from "react";
import { WidgetProps } from "@courselit/common-models";
import Settings from "./settings";
import { Image } from "@courselit/components-library";
import {
    verticalPadding as defaultVerticalPadding,
    horizontalPadding as defaultHorizontalPadding,
} from "./defaults";
import clsx from "clsx";

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
                            {youtubeLink && (
                                <div className="flex justify-center">
                                    <div
                                        className={`w-full relative h-0 overflow-hidden pb-[56.25%] ${twRoundedMap[mediaRadius]}`}
                                    >
                                        <iframe
                                            src={`https://www.youtube.com/embed/${youtubeLink}`}
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            className="absolute top-0 left-0 w-full h-full"
                                        />
                                    </div>
                                </div>
                            )}
                            {!youtubeLink && media && media.mediaId && (
                                <div
                                    className={`w-full text-center overflow-hidden ${twRoundedMap[mediaRadius]}`}
                                    style={{
                                        width: "100%",
                                    }}
                                >
                                    {RegExp("image/").test(media.mimeType) && (
                                        <Image
                                            src={media.file}
                                            alt={media.caption}
                                        />
                                    )}
                                    {RegExp("video/").test(media.mimeType) && (
                                        <video
                                            controls
                                            controlsList="nodownload" // eslint-disable-line react/no-unknown-property
                                            className={clsx(
                                                "w-full rounded mb-2",
                                            )}
                                            poster={media.thumbnail}
                                        >
                                            <source
                                                src={media.file}
                                                type="video/mp4"
                                            />
                                            Your browser does not support the
                                            video tag.
                                        </video>
                                    )}
                                </div>
                            )}
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
