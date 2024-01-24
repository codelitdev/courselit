import React from "react";
import { WidgetProps } from "@courselit/common-models";
import Settings from "./settings";
import { Image, TextRenderer, Button2 } from "@courselit/components-library";

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
        mediaRadius = 0,
        horizontalPadding,
        verticalPadding,
        secondaryButtonAction,
        secondaryButtonCaption,
        secondaryButtonBackground,
        secondaryButtonForeground,
        titleFontSize,
        descriptionFontSize,
        contentAlignment,
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
            style={{
                backgroundColor,
                color: foregroundColor,
            }}
        >
            <div
                className={`flex flex-col px-4 w-full mx-auto lg:max-w-[${horizontalPadding}%] gap-4 ${direction}`}
            >
                {hasHeroGraphic && (
                    <div
                        className={`w-full sm:mb-2 sm:pr-0 sm:pl-0 md:w-1/2 md:mb-0 ${
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
                            <div className="flex justify-center">
                                <div className="w-full relative h-0 overflow-hidden rounded-md pb-[56.25%]">
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
                                className="w-full text-center"
                                style={{
                                    borderRadius: `${mediaRadius}px`,
                                    width: "100%",
                                }}
                            >
                                <Image src={media.file} />
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
                        className={`flex flex-col justify-center ${
                            hasHeroGraphic
                                ? ""
                                : contentAlignment === "center"
                                ? "items-center"
                                : "items-start"
                        }`}
                    >
                        <h2
                            className={`mb-4 font-bold text-${titleFontSize}xl `}
                        >
                            {title}
                        </h2>
                        {description && (
                            <div
                                className={`${
                                    descriptionFontSize === 0
                                        ? "text-lg"
                                        : descriptionFontSize === 1
                                        ? "text-xl"
                                        : `text-${descriptionFontSize}xl`
                                } ${
                                    buttonAction && buttonCaption
                                        ? "mb-8"
                                        : "mb-0"
                                }`}
                            >
                                <TextRenderer json={description} />
                            </div>
                        )}
                        <div className="flex flex-col md:!flex-row gap-2">
                            {buttonAction && buttonCaption && (
                                <Button2
                                    href={buttonAction}
                                    component="link"
                                    style={{
                                        backgroundColor: buttonBackground,
                                        color: buttonForeground,
                                    }}
                                    className="min-w-[200px]"
                                    size="lg"
                                >
                                    {buttonCaption}
                                </Button2>
                            )}
                            {secondaryButtonAction &&
                                secondaryButtonCaption && (
                                    <Button2
                                        href={secondaryButtonAction}
                                        component="link"
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
                                )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
