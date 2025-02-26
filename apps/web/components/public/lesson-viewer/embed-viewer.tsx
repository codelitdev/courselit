import React from "react";
import { UIConstants } from "@courselit/common-models";

const YouTubeEmbed = ({ content }: { content: string }) => {
    const match = content.match(UIConstants.YOUTUBE_REGEX);

    return (
        <div className="aspect-video">
            <iframe
                className="w-full h-full rounded-lg"
                src={`https://www.youtube.com/embed/${match![1]}`}
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
        <div className="flex flex-col min-h-screen">
            {content.value.match(UIConstants.YOUTUBE_REGEX) && (
                <div className="mb-4">
                    <YouTubeEmbed content={content.value} />
                </div>
            )}
            <a
                href={content.value}
                className="text-sm text-muted-foreground text-center hover:underline"
            >
                {content.value}
            </a>
        </div>
    );
};

export default LessonEmbedViewer;
