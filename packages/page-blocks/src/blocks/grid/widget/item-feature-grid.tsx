import React from "react";
import { Link } from "@courselit/components-library";
import { TextRenderer } from "../../../components";
import { isVideo } from "@courselit/utils";
import {
    Link as PageLink,
    PageCard,
    PageCardContent,
    PageCardImage,
    Text1,
    Header4,
} from "@courselit/page-primitives";
import { processedSvg } from "../helpers";
import { ItemmProps } from "./item";
import { getGraphicMediaAspectRatioClass } from "./media-aspect-ratio";

export default function ItemFeatureGrid({
    item: { title, description, buttonAction, buttonCaption, media, svgText },
    alignment,
    theme,
    svgStyle,
    graphicType = "media",
    mediaAlignment = "left",
    graphicMediaAspectRatio = "1/1",
}: ItemmProps) {
    const showSvg = graphicType === "svg" && !!svgText;
    const showMedia =
        graphicType === "media" && !!(media && (media.file || media.thumbnail));
    const mediaIsVideo = isVideo(undefined, media);

    return (
        <PageCard
            className="h-full bg-transparent shadow-none"
            theme={{
                ...theme,
                interactives: {
                    ...theme.interactives,
                    card: {
                        ...theme.interactives?.card,
                        border: {
                            width: "border-0",
                            style: "border-none",
                            radius: "rounded-none",
                        },
                        shadow: "shadow-none",
                        custom: "bg-transparent text-foreground",
                    },
                },
            }}
        >
            <PageCardContent
                className="h-full flex flex-col justify-start"
                theme={theme}
            >
                <div
                    className={`flex ${mediaAlignment === "center" ? "flex-col items-center text-center" : "flex-row items-start"} gap-6 w-full`}
                >
                    {(showSvg || showMedia) && (
                        <div
                            className={`flex-shrink-0 mt-1 flex flex-col gap-4 items-center ${
                                mediaAlignment === "center"
                                    ? ""
                                    : mediaAlignment === "right"
                                      ? "order-2 ml-6"
                                      : "order-1 mr-6"
                            }`}
                        >
                            {showSvg && (
                                <div
                                    className="flex justify-center items-center"
                                    style={{
                                        width: `${svgStyle.width}px`,
                                        height: `${svgStyle.height}px`,
                                        backgroundColor:
                                            svgStyle.backgroundColor,
                                        borderRadius: `${svgStyle.borderRadius}px`,
                                        borderWidth: `${svgStyle.borderWidth}px`,
                                        borderStyle: svgStyle.borderStyle,
                                        borderColor: svgStyle.borderColor,
                                        padding: "8px",
                                    }}
                                    dangerouslySetInnerHTML={{
                                        __html:
                                            processedSvg(svgText, svgStyle) ||
                                            '<div class="text-red-500">Invalid SVG</div>',
                                    }}
                                />
                            )}
                            {showMedia && (
                                <PageCardImage
                                    alt={media.caption || ""}
                                    src={
                                        mediaIsVideo
                                            ? media.thumbnail ||
                                              "/placeholder.svg?height=64&width=64"
                                            : media.file ||
                                              media.thumbnail ||
                                              ""
                                    }
                                    className={`!w-20 !h-auto ${getGraphicMediaAspectRatioClass(graphicMediaAspectRatio)} rounded-lg object-cover`}
                                />
                            )}
                        </div>
                    )}
                    <div
                        className={`flex flex-col grow gap-2 ${
                            mediaAlignment === "center"
                                ? "items-center text-center"
                                : mediaAlignment === "right"
                                  ? "order-1 min-w-0 items-start text-left"
                                  : "order-2 min-w-0 items-start text-left"
                        } ${alignment === "center" ? "md:items-center md:text-center" : ""}`}
                    >
                        {title && <Header4 theme={theme}>{title}</Header4>}
                        <article
                            className={`flex flex-col ${alignment === "center" ? "items-center" : "items-start"}`}
                        >
                            {description && (
                                <div
                                    className={`${alignment === "center" ? "text-center" : "text-left"}`}
                                >
                                    <Text1 theme={theme} component="span">
                                        <TextRenderer
                                            json={description}
                                            theme={theme}
                                        />
                                    </Text1>
                                </div>
                            )}
                        </article>

                        {buttonAction && buttonCaption && (
                            <div className="mt-4">
                                <Link href={buttonAction}>
                                    <PageLink theme={theme}>
                                        {buttonCaption}
                                    </PageLink>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </PageCardContent>
        </PageCard>
    );
}
