import React from "react";
import { Link } from "@courselit/components-library";
import { TextRenderer } from "../../../components";
import { isVideo } from "@courselit/utils";
import {
    Button,
    PageCard,
    PageCardHeader,
    PageCardContent,
    PageCardImage,
    Text1,
} from "@courselit/page-primitives";
import { processedSvg } from "../helpers";
import { ItemmProps } from "./item";
import { getGraphicMediaAspectRatioClass } from "./media-aspect-ratio";

export default function ItemDefault({
    item: { title, description, buttonAction, buttonCaption, media, svgText },
    alignment,
    theme,
    svgStyle,
    svgInline,
    graphicType = "media",
    mediaAlignment = "top",
    graphicMediaAspectRatio = "1/1",
}: ItemmProps) {
    const showSvg = graphicType === "svg" && !!svgText;
    const showMedia =
        graphicType === "media" && !!(media && (media.file || media.thumbnail));
    const mediaIsVideo = isVideo(undefined, media);

    return (
        <PageCard className="h-full" theme={theme}>
            <PageCardContent className="h-full flex flex-col" theme={theme}>
                <PageCardHeader theme={theme}>
                    <div
                        className={`flex gap-4 ${mediaAlignment === "bottom" ? "flex-col" : "flex-col-reverse"} ${alignment === "center" ? "items-center text-center" : "items-start text-left"}`}
                    >
                        <div
                            className={`flex ${svgInline ? "flex-row gap-2 items-center" : `flex-col gap-4 ${alignment === "center" ? "items-center" : "items-start"}`}`}
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
                            {title}
                        </div>
                        {showMedia && (
                            <div className="mb-4">
                                {mediaIsVideo && media?.file ? (
                                    <video
                                        src={media.file}
                                        poster={media.thumbnail}
                                        controls
                                        controlsList="nodownload" // eslint-disable-line react/no-unknown-property
                                        onContextMenu={(e) =>
                                            e.preventDefault()
                                        }
                                        className={`${getGraphicMediaAspectRatioClass(graphicMediaAspectRatio)} w-full rounded object-cover`}
                                    >
                                        Your browser does not support the video
                                        tag.
                                    </video>
                                ) : (
                                    <PageCardImage
                                        alt={media?.caption || ""}
                                        src={
                                            media?.file ||
                                            media?.thumbnail ||
                                            ""
                                        }
                                        className={`${getGraphicMediaAspectRatioClass(graphicMediaAspectRatio)} rounded object-cover`}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </PageCardHeader>
                <article
                    className={`grow flex flex-col ${
                        alignment === "center" ? "items-center" : "items-start"
                    }`}
                >
                    {description && (
                        <div
                            className={`grow mb-2 ${
                                alignment === "center"
                                    ? "text-center"
                                    : "text-left"
                            }`}
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
                    <Link href={buttonAction} className="w-full">
                        <Button className="w-full" theme={theme}>
                            {buttonCaption}
                        </Button>
                    </Link>
                )}
            </PageCardContent>
        </PageCard>
    );
}
