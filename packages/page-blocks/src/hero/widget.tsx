import React from "react";
import { WidgetProps } from "@courselit/common-models";
import Settings from "./settings";
import {
    Image,
    TextRenderer,
    VideoWithPreview,
} from "@courselit/components-library";
import {
    verticalPadding as defaultVerticalPadding,
    maxWidth as defaultMaxWidth,
} from "./defaults";
import { isVideo } from "@courselit/utils";
import clsx from "clsx";
import {
    Button,
    Header1,
    Link,
    Subheader1,
    Section,
} from "@courselit/page-primitives";

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
        title,
        description,
        buttonCaption,
        buttonAction,
        media,
        youtubeLink,
        alignment = "left",
        backgroundColor,
        foregroundColor,
        buttonBackground,
        buttonForeground,
        style = "normal",
        mediaRadius = 2,
        verticalPadding = defaultVerticalPadding,
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
        maxWidth = defaultMaxWidth,
    },
    state: { theme },
}: WidgetProps<Settings>) {
    const overiddenTheme = JSON.parse(JSON.stringify(theme));
    overiddenTheme.structure.page.width =
        maxWidth || theme.structure.page.width;
    overiddenTheme.structure.section.verticalPadding =
        verticalPadding || theme.structure.section.verticalPadding;

    const hasHeroGraphic = youtubeLink || (media && media.mediaId);
    let direction: "md:!flex-row" | "md:!flex-row-reverse";
    switch (alignment) {
        case "left":
            direction = "md:!flex-row";
            break;
        case "right":
            direction = "md:!flex-row-reverse";
            break;
        default:
            direction = "md:!flex-row";
    }

    const defaultStyle = {
        backgroundColor: backgroundColor || theme?.colors?.background,
        color: foregroundColor || theme?.colors?.text,
    };

    return (
        <Section
            theme={overiddenTheme}
            style={style === "card" ? {} : defaultStyle}
            id={cssId}
        >
            <div
                className={clsx(
                    "flex flex-col gap-4",
                    direction,
                    style === "card" ? "px-4 py-4 rounded-md" : "",
                )}
                style={style === "card" ? defaultStyle : {}}
            >
                {hasHeroGraphic && (
                    <div
                        className={`w-full sm:mb-2 sm:pr-0 sm:pl-0 md:w-1/2 md:mb-0 flex items-center ${
                            hasHeroGraphic && alignment === "right"
                                ? "md:pl-1"
                                : "md:pl-0"
                        } ${
                            hasHeroGraphic && alignment === "right"
                                ? "md:pl-1"
                                : "md:pl-0"
                        }`}
                    >
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
                <div
                    className={`w-full ${
                        hasHeroGraphic ? "md:w-1/2" : "md:w-full"
                    } sm:pr-0 sm:pl-0 ${
                        hasHeroGraphic && alignment === "right"
                            ? "md:pr-1"
                            : "md:pr-0"
                    } ${
                        hasHeroGraphic && alignment === "left"
                            ? "md:pl-1"
                            : "md:pl-0"
                    }`}
                >
                    <div
                        className={clsx(
                            "flex flex-col justify-center h-full gap-4",
                            contentAlignment === "center"
                                ? "items-center text-center"
                                : "items-start",
                        )}
                    >
                        <Header1 theme={overiddenTheme} className="mb-4">
                            {title}
                        </Header1>
                        {description && (
                            <div
                                className={clsx(
                                    descriptionFontSize === 0
                                        ? "text-base"
                                        : descriptionFontSize === 1
                                          ? "text-lg lg:text-xl"
                                          : `text-${
                                                descriptionFontSize - 1 === 1
                                                    ? ""
                                                    : descriptionFontSize - 1
                                            }xl lg:text-${descriptionFontSize}xl`,
                                    buttonAction && buttonCaption
                                        ? "mb-8"
                                        : "mb-0",
                                )}
                            >
                                <Subheader1 theme={overiddenTheme}>
                                    <TextRenderer json={description} />
                                </Subheader1>
                            </div>
                        )}
                        <div
                            className={`flex flex-col md:!flex-row gap-2 w-full ${contentAlignment === "center" ? "md:!justify-center" : ""}`}
                        >
                            {buttonAction && buttonCaption && (
                                <Link
                                    href={buttonAction}
                                    theme={overiddenTheme}
                                >
                                    <Button
                                        style={{
                                            backgroundColor: buttonBackground,
                                            color: buttonForeground,
                                        }}
                                        theme={overiddenTheme}
                                        className="w-full md:min-w-[150px]"
                                        // size="lg"
                                    >
                                        {buttonCaption}
                                    </Button>
                                </Link>
                            )}
                            {secondaryButtonAction &&
                                secondaryButtonCaption && (
                                    <Link
                                        href={secondaryButtonAction}
                                        theme={overiddenTheme}
                                    >
                                        <Button
                                            style={{
                                                backgroundColor:
                                                    secondaryButtonBackground,
                                                color: secondaryButtonForeground,
                                            }}
                                            theme={overiddenTheme}
                                            className="w-full md:min-w-[150px]"
                                            variant="secondary"
                                            // size="lg"
                                        >
                                            {secondaryButtonCaption}
                                        </Button>
                                    </Link>
                                )}
                        </div>
                    </div>
                </div>
            </div>
        </Section>
    );
}
