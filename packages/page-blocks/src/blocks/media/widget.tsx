import React from "react";
import { WidgetProps } from "@courselit/common-models";
import Settings from "./settings";
import { Image, VideoWithPreview } from "@courselit/components-library";
import { isVideo } from "@courselit/utils";
import { Section } from "@courselit/page-primitives";
import { ThemeStyle } from "@courselit/page-models";

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
        cssId,
        playVideoInModal,
        aspectRatio,
        objectFit,
        maxWidth,
        verticalPadding,
    },
    state: { theme },
}: WidgetProps<Settings>) {
    const overiddenTheme: ThemeStyle = JSON.parse(JSON.stringify(theme.theme));
    overiddenTheme.structure.page.width =
        maxWidth || theme.theme.structure.page.width;
    overiddenTheme.structure.section.verticalPadding =
        verticalPadding || theme.theme.structure.section.verticalPadding;

    const hasHeroGraphic = youtubeLink || (media && media.mediaId);

    return (
        <Section
            theme={overiddenTheme}
            style={{
                backgroundColor,
            }}
            id={cssId}
        >
            <div className={`flex flex-col gap-4`}>
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
                                    videoUrl={youtubeLink || media?.file || ""}
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
        </Section>
    );
}
