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
    Text2,
} from "@courselit/page-primitives";
import { ItemmProps } from "./item";
import { getGraphicMediaAspectRatioClass } from "./media-aspect-ratio";

export default function ItemMediaCard({
    item: { title, subTitle, description, buttonAction, buttonCaption, media },
    alignment,
    theme,
    graphicMediaAspectRatio = "16/9",
}: ItemmProps) {
    const showMedia = !!(media && (media.file || media.thumbnail));
    const mediaIsVideo = isVideo(undefined, media);

    return (
        <PageCard
            className="h-full flex flex-col overflow-hidden w-full"
            theme={theme}
        >
            {showMedia && (
                <>
                    {mediaIsVideo && media?.file ? (
                        <video
                            src={media.file}
                            poster={media.thumbnail}
                            controls
                            controlsList="nodownload" // eslint-disable-line react/no-unknown-property
                            onContextMenu={(e) => e.preventDefault()}
                            className={`${getGraphicMediaAspectRatioClass(graphicMediaAspectRatio)} object-cover w-full`}
                        >
                            Your browser does not support the video tag.
                        </video>
                    ) : (
                        <PageCardImage
                            alt={media?.caption || ""}
                            src={media?.file || media?.thumbnail || ""}
                            className={`${getGraphicMediaAspectRatioClass(graphicMediaAspectRatio)} object-cover w-full`}
                            theme={theme}
                        />
                    )}
                </>
            )}
            <PageCardContent
                className="flex flex-col grow justify-between"
                theme={theme}
            >
                <div className="flex flex-col grow">
                    {title && (
                        <PageCardHeader
                            theme={theme}
                            className={`pt-2 ${alignment === "center" ? "text-center" : "text-left"}`}
                        >
                            {title}
                        </PageCardHeader>
                    )}
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
                </div>
                {(subTitle || (buttonAction && buttonCaption)) && (
                    <div
                        className={`mt-6 flex ${subTitle && buttonCaption ? "justify-between" : alignment === "center" ? "justify-center" : "justify-start"} items-center w-full`}
                    >
                        {subTitle && (
                            <Text2 theme={theme} component="span">
                                {subTitle}
                            </Text2>
                        )}
                        {buttonAction && buttonCaption && (
                            <Link href={buttonAction}>
                                <Button theme={theme}>{buttonCaption}</Button>
                            </Link>
                        )}
                    </div>
                )}
            </PageCardContent>
        </PageCard>
    );
}
