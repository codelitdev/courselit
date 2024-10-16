import React from "react";
import { WidgetProps } from "@courselit/common-models";
import Settings from "./settings";
import {
    Image,
    TextRenderer,
    Button2,
    Link,
} from "@courselit/components-library";
import {
    verticalPadding as defaultVerticalPadding,
    horizontalPadding as defaultHorizontalPadding,
    mediaAspectRatio as defaultMediaAspectRatio,
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
        title,
        description,
        buttonCaption,
        buttonAction,
        media,
        mediaAspectRatio = defaultMediaAspectRatio,
        youtubeLink,
        alignment = "left",
        backgroundColor,
        foregroundColor,
        buttonBackground,
        buttonForeground,
        style = "normal",
        mediaRadius = 2,
        horizontalPadding = defaultHorizontalPadding,
        verticalPadding = defaultVerticalPadding,
        secondaryButtonAction,
        secondaryButtonCaption,
        secondaryButtonBackground,
        secondaryButtonForeground,
        titleFontSize,
        descriptionFontSize,
        contentAlignment,
        cssId,
    },
}: WidgetProps<Settings>) {
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

    return (
        <section
            className={`py-[${verticalPadding}px]`}
            style={
                style === "card"
                    ? {}
                    : {
                          backgroundColor,
                          color: foregroundColor,
                      }
            }
            id={cssId}
        >
            <div className="mx-auto lg:max-w-[1200px]">
                <div
                    className={clsx(
                        "w-full !mx-auto",
                        `lg:max-w-[${horizontalPadding}%]`,
                        direction,
                    )}
                >
                    <div
                        className={clsx(
                            "flex flex-col px-4 gap-4",
                            direction,
                            style === "card" ? "mx-4 py-4 rounded-md" : "",
                        )}
                        style={
                            style === "card"
                                ? {
                                      backgroundColor,
                                      color: foregroundColor,
                                  }
                                : {}
                        }
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
                                {youtubeLink && (
                                    <div className="flex justify-center grow">
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
                                    >
                                        {media.mimeType.split("/")[0] ===
                                            "image" && (
                                            <Image
                                                src={media.file}
                                                alt={media.caption}
                                                className={`!${mediaAspectRatio}`}
                                            />
                                        )}
                                        {media.mimeType.split("/")[0] ===
                                            "video" && (
                                            <video
                                                controls
                                                controlsList="nodownload" // eslint-disable-line react/no-unknown-property
                                                className={clsx(
                                                    "w-full rounded mb-2",
                                                    mediaAspectRatio,
                                                )}
                                            >
                                                <source
                                                    src={media.file}
                                                    type="video/mp4"
                                                />
                                                Your browser does not support
                                                the video tag.
                                            </video>
                                        )}
                                    </div>
                                )}
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
                                    "flex flex-col justify-center h-full",
                                    contentAlignment === "center"
                                        ? "items-center text-center"
                                        : "items-start",
                                )}
                            >
                                <h2
                                    className={`mb-4 font-bold lg:text-${titleFontSize}xl text-${Math.ceil(
                                        titleFontSize * 0.66,
                                    )}xl`}
                                >
                                    {title}
                                </h2>
                                {description && (
                                    <div
                                        className={clsx(
                                            descriptionFontSize === 0
                                                ? "text-base"
                                                : descriptionFontSize === 1
                                                  ? "text-lg lg:text-xl"
                                                  : `text-${
                                                        descriptionFontSize -
                                                            1 ===
                                                        1
                                                            ? ""
                                                            : descriptionFontSize -
                                                              1
                                                    }xl lg:text-${descriptionFontSize}xl`,
                                            buttonAction && buttonCaption
                                                ? "mb-8"
                                                : "mb-0",
                                        )}
                                    >
                                        <TextRenderer json={description} />
                                    </div>
                                )}
                                <div className="flex flex-col md:!flex-row gap-2">
                                    {buttonAction && buttonCaption && (
                                        <Link href={buttonAction}>
                                            <Button2
                                                style={{
                                                    backgroundColor:
                                                        buttonBackground,
                                                    color: buttonForeground,
                                                }}
                                                className="min-w-[200px]"
                                                size="lg"
                                            >
                                                {buttonCaption}
                                            </Button2>
                                        </Link>
                                    )}
                                    {secondaryButtonAction &&
                                        secondaryButtonCaption && (
                                            <Link href={secondaryButtonAction}>
                                                <Button2
                                                    style={{
                                                        backgroundColor:
                                                            secondaryButtonBackground,
                                                        color: secondaryButtonForeground,
                                                    }}
                                                    className="min-w-[200px]"
                                                    variant="secondary"
                                                    size="lg"
                                                >
                                                    {secondaryButtonCaption}
                                                </Button2>
                                            </Link>
                                        )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
