import React from "react";
import { WidgetProps } from "@courselit/common-models";
import Settings from "./settings";
import { Image, Link } from "@courselit/components-library";
import { TextRenderer, VideoWithPreview } from "../../components";
import { isVideo } from "@courselit/utils";
import clsx from "clsx";
import {
    Button,
    Header1,
    Subheader1,
    Section,
    PageCard,
    PageCardContent,
} from "@courselit/page-primitives";
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

const twFontSize = {
    3: "text-4xl",
    4: "text-5xl",
    5: "text-6xl",
    6: "text-7xl",
    7: "text-8xl",
    8: "text-9xl",
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
        mediaRadius = 2,
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
        layout = "normal",
    },
    state: { theme },
    nextTheme,
}: WidgetProps<Settings>) {
    const overiddenTheme: ThemeStyle = JSON.parse(JSON.stringify(theme.theme));
    overiddenTheme.structure.page.width =
        maxWidth || theme.theme.structure.page.width;
    overiddenTheme.structure.section.padding.y =
        verticalPadding || theme.theme.structure.section.padding.y;

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

    const mainContent = (
        <div className={clsx("flex flex-col gap-4", direction)}>
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
                    <Header1
                        theme={overiddenTheme}
                        className={`mb-4 ${twFontSize[titleFontSize || 0]}`}
                    >
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
                                buttonAction && buttonCaption ? "mb-8" : "mb-0",
                            )}
                        >
                            <Subheader1 theme={overiddenTheme} component="span">
                                <TextRenderer
                                    json={description}
                                    theme={overiddenTheme}
                                />
                            </Subheader1>
                        </div>
                    )}
                    <div
                        className={`flex flex-col md:!flex-row gap-2 w-full ${contentAlignment === "center" ? "md:!justify-center" : ""}`}
                    >
                        {buttonAction && buttonCaption && (
                            <Link href={buttonAction}>
                                <Button
                                    theme={overiddenTheme}
                                    className="w-full md:min-w-[150px]"
                                >
                                    {buttonCaption}
                                </Button>
                            </Link>
                        )}
                        {secondaryButtonAction && secondaryButtonCaption && (
                            <Link href={secondaryButtonAction}>
                                <Button
                                    theme={overiddenTheme}
                                    className="w-full md:min-w-[150px]"
                                    variant="secondary"
                                >
                                    {secondaryButtonCaption}
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <Section
            theme={overiddenTheme}
            id={cssId}
            background={background}
            nextTheme={nextTheme as "dark" | "light"}
        >
            {layout === "normal" ? (
                mainContent
            ) : (
                <PageCard theme={overiddenTheme}>
                    <PageCardContent theme={overiddenTheme}>
                        {mainContent}
                    </PageCardContent>
                </PageCard>
            )}
        </Section>
    );
}
