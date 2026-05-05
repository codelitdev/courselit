import React from "react";
import { SandboxedEmbed } from "@courselit/page-blocks";
import { extractVideoId } from "@courselit/utils";

const YouTubeEmbed = ({ content }: { content: string }) => {
    const videoId = extractVideoId(content, "youtube");

    return (
        <div className="aspect-video">
            <iframe
                className="w-full h-full rounded-lg"
                src={`https://www.youtube.com/embed/${videoId || ""}`}
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
    const isYouTube = !!extractVideoId(content.value, "youtube");
    const hasScript = content.value.includes("<script");

    return (
        <>
            {isYouTube ? (
                <YouTubeEmbed content={content.value} />
            ) : hasScript ? (
                <SandboxedEmbed content={content.value} />
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
