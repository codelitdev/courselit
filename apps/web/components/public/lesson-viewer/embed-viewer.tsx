import React from "react";
import { UIConstants } from "@courselit/common-models";

const YouTubeEmbed = ({ content }: { content: string }) => {
    const match = content.match(UIConstants.YOUTUBE_REGEX);

    return (
        <div className="aspect-video">
            <iframe
                className="w-full h-full rounded-lg"
                src={`https://www.youtube.com/embed/${match ? match[1] : ""}`}
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            />
        </div>
    );
};

interface LessonEmbedViewerProps {
    content: { value: string };
}

const LessonEmbedViewer = ({ content }: LessonEmbedViewerProps) => {
    return (
        <>
            {content.value.includes("youtube") ||
            content.value.includes("youtu.be") ? (
                <YouTubeEmbed content={content.value} />
            ) : (
                <div
                    dangerouslySetInnerHTML={{
                        __html: content.value,
                    }}
                ></div>
            )}
        </>
    );
};

export default LessonEmbedViewer;
