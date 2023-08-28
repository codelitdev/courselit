import React from "react";

// Regex taken from: https://stackoverflow.com/a/8260383
const YouTubeRegex =
    /.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#\&\?]*).*/;

const YouTubeEmbed = ({ content }: { content: string }) => {
    const match = content.match(YouTubeRegex);

    return (
        <div className="flex justify-center">
            <div className="w-full relative h-0 overflow-hidden rounded-md pb-[56.25%]">
                <iframe
                    src={`https://www.youtube.com/embed/${match![1]}`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute top-0 left-0 w-full h-full"
                />
            </div>
        </div>
    );
};

interface LessonEmbedViewerProps {
    content: { value: string };
}

const LessonEmbedViewer = ({ content }: LessonEmbedViewerProps) => {
    return (
        <div className="flex flex-col min-h-screen">
            {content.value.match(YouTubeRegex) && (
                <div className="mb-4">
                    <YouTubeEmbed content={content.value} />
                </div>
            )}
            <a href={content.value}>{content.value}</a>
        </div>
    );
};

export default LessonEmbedViewer;
