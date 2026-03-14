import React from "react";
import { TextRenderer } from "../../../components";
import { isVideo } from "@courselit/utils";
import {
    PageCard,
    PageCardContent,
    PageCardImage,
    Text1,
    Text2,
    Header4,
} from "@courselit/page-primitives";
import { ItemmProps } from "./item";

export default function ItemTestimonial({
    item: { title, subTitle, description, media },
    alignment,
    theme,
    mediaAlignment = "left",
}: ItemmProps) {
    const showMedia = !!(media && (media.file || media.thumbnail));
    const mediaIsVideo = isVideo(undefined, media);

    return (
        <PageCard className="h-full" theme={theme}>
            <PageCardContent
                className="h-full flex flex-col justify-between"
                theme={theme}
            >
                <div className={`flex grow flex-col`}>
                    <div className={`flex flex-col gap-6 grow`}>
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

                    <div
                        className={`flex items-center gap-4 mt-8 ${mediaAlignment === "center" ? "flex-col justify-center" : mediaAlignment === "right" ? "flex-row-reverse justify-between w-full" : "flex-row justify-start"}`}
                    >
                        {showMedia && (
                            <PageCardImage
                                alt={media.caption || ""}
                                src={
                                    mediaIsVideo
                                        ? media.thumbnail ||
                                          "/placeholder.svg?height=48&width=48"
                                        : media.file || media.thumbnail || ""
                                }
                                className="!w-12 !h-12 !aspect-square rounded-full object-cover shrink-0"
                            />
                        )}
                        <div
                            className={`flex flex-col ${mediaAlignment === "center" ? "items-center text-center" : "items-start text-left"}`}
                        >
                            {title && <Header4 theme={theme}>{title}</Header4>}
                            {subTitle && (
                                <Text2 theme={theme}>{subTitle}</Text2>
                            )}
                        </div>
                    </div>
                </div>
            </PageCardContent>
        </PageCard>
    );
}
