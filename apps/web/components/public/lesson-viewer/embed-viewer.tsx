import React from "react";
import ReactPlayer from "react-player";
import { UIConstants } from "@courselit/common-models";

const YouTubeEmbed = ({ content }: { content: string }) => {
    return (
        <div className="aspect-video">
            <ReactPlayer
                src={content}
                controls
                width="100%"
                height="100%"
                style={{ position: "absolute", top: 0, left: 0 }}
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
