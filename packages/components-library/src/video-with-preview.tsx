import { useState, useEffect } from "react";
import { Play, X } from "lucide-react";

type VideoType = "youtube" | "vimeo" | "self-hosted";

export type AspectRatio =
    | "16/9" // Widescreen
    | "4/3" // Standard
    | "1/1" // Square
    | "21/9" // Ultrawide
    | "9/16" // Vertical
    | "2/1" // Panoramic
    | "3/2" // Classic
    | string; // Allow custom aspect ratios

export interface VideoThumbnailProps {
    title?: string;
    thumbnailUrl?: string;
    videoUrl: string;
    aspectRatio?: AspectRatio;
    modal?: boolean;
}

export function VideoWithPreview({
    title = "Video",
    thumbnailUrl,
    videoUrl = "https://www.youtube.com/watch?v=VLVcZB2-udk",
    aspectRatio = "16/9",
    modal = false,
}: VideoThumbnailProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [vimeoThumbnail, setVimeoThumbnail] = useState<string | null>(null);

    const detectVideoType = (): VideoType => {
        const url = videoUrl.toLowerCase();

        if (url.includes("youtube.com") || url.includes("youtu.be")) {
            return "youtube";
        }

        if (url.includes("vimeo.com")) {
            return "vimeo";
        }

        return "self-hosted";
    };

    const videoType = detectVideoType();

    // Extract video ID based on platform
    const getVideoId = () => {
        if (videoType === "youtube") {
            try {
                const url = new URL(videoUrl);

                // Handle youtube.com/watch?v= format
                if (
                    url.hostname === "youtube.com" ||
                    url.hostname === "www.youtube.com"
                ) {
                    return url.searchParams.get("v");
                }

                // Handle youtu.be/ format
                if (url.hostname === "youtu.be") {
                    return url.pathname.slice(1); // Remove leading slash
                }

                // Handle youtube.com/embed/ format
                if (
                    url.hostname === "youtube.com" ||
                    url.hostname === "www.youtube.com"
                ) {
                    const pathParts = url.pathname.split("/");
                    if (pathParts[1] === "embed") {
                        return pathParts[2];
                    }
                }
            } catch (error) {
                console.error("Invalid YouTube URL:", error);
                return null;
            }
        }

        if (videoType === "vimeo") {
            try {
                const url = new URL(videoUrl);
                if (url.hostname === "vimeo.com") {
                    const videoId = url.pathname.slice(1); // Remove leading slash
                    // Validate that the ID is numeric
                    if (/^\d+$/.test(videoId)) {
                        return videoId;
                    }
                }
            } catch (error) {
                console.error("Invalid Vimeo URL:", error);
                return null;
            }
        }

        return null;
    };

    // Fetch Vimeo thumbnail if needed
    useEffect(() => {
        const fetchVimeoThumbnail = async () => {
            // Skip fetching if a thumbnail URL is already provided
            if (thumbnailUrl || videoType !== "vimeo") return;

            const videoId = getVideoId();
            if (!videoId) return;

            try {
                // Use Vimeo's oEmbed API to get thumbnail (no token required)
                const response = await fetch(
                    `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`,
                );

                if (response.ok) {
                    const data = await response.json();
                    setVimeoThumbnail(data.thumbnail_url);
                }
            } catch (error) {
                console.error("Error fetching Vimeo thumbnail:", error);
            }
        };

        fetchVimeoThumbnail();
    }, [videoUrl, videoType, thumbnailUrl]);

    // Get the appropriate thumbnail URL
    const getThumbnailUrl = () => {
        // If a thumbnail URL is explicitly provided, use that
        if (thumbnailUrl) return thumbnailUrl;

        // For YouTube videos, generate thumbnail URL
        if (videoType === "youtube") {
            const videoId = getVideoId();
            if (videoId) {
                return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            }
        }

        // For Vimeo videos, use the fetched thumbnail
        if (videoType === "vimeo" && vimeoThumbnail) {
            return vimeoThumbnail;
        }

        // Fall back to placeholder
        return "/placeholder.svg?height=480&width=854";
    };

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isModalOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }

        return () => {
            document.body.style.overflow = "";
        };
    }, [isModalOpen]);

    // Get embed URL based on video type
    const getEmbedUrl = () => {
        const videoId = getVideoId();
        // Add autoplay parameter for in-place videos
        const shouldAutoplay = isPlaying;

        if (videoType === "youtube") {
            if (videoId) {
                return `https://www.youtube.com/embed/${videoId}${shouldAutoplay ? "?autoplay=1" : ""}`;
            }

            // If we couldn't extract the ID but it's a YouTube URL, try to use it directly
            const hasParams = videoUrl.includes("?");
            return (
                videoUrl +
                (shouldAutoplay && !hasParams
                    ? "?autoplay=1"
                    : shouldAutoplay && hasParams
                      ? "&autoplay=1"
                      : "")
            );
        }

        if (videoType === "vimeo" && videoId) {
            return `https://player.vimeo.com/video/${videoId}${shouldAutoplay ? "?autoplay=1" : ""}`;
        }

        // For self-hosted videos, return the URL as is
        return videoUrl;
    };

    // Calculate aspect ratio style
    const aspectRatioStyle = () => {
        if (!aspectRatio.includes("/")) return {};

        const [width, height] = aspectRatio.split("/").map(Number);
        if (!width || !height) return {};

        return {
            aspectRatio: `${width}/${height}`,
        };
    };

    // Handle thumbnail click
    const handleThumbnailClick = () => {
        if (modal) {
            setIsModalOpen(true);
        } else {
            setIsPlaying(true);
        }
    };

    return (
        <div className={aspectRatio === "9/16" ? "max-w-xs mx-auto" : ""}>
            {/* Thumbnail with play button or in-place video */}
            <div
                className="relative overflow-hidden"
                style={aspectRatioStyle()}
            >
                {!modal && isPlaying ? (
                    // In-place video player
                    <div className="w-full h-full">
                        {videoType !== "self-hosted" ? (
                            <iframe
                                src={getEmbedUrl()}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        ) : (
                            <video
                                src={videoUrl}
                                controls
                                autoPlay
                                className="w-full h-full"
                            >
                                Your browser does not support the video tag.
                            </video>
                        )}
                    </div>
                ) : (
                    // Thumbnail with play button
                    <div
                        className="cursor-pointer group w-full h-full"
                        onClick={handleThumbnailClick}
                    >
                        <img
                            src={getThumbnailUrl() || "/placeholder.svg"}
                            alt={`Thumbnail for ${title}`}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <div className="relative">
                                {/* Smaller grayish concentric wave animation */}
                                <span className="absolute -inset-1.5 rounded-full bg-gray-200/50 animate-pulse duration-[3000ms]"></span>

                                {/* Play button */}
                                <div className="relative rounded-full bg-primary p-4 z-1">
                                    <Play
                                        className="h-8 w-8 text-white"
                                        fill="white"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Custom Video Modal (only used when modal is true) */}
            {modal && isModalOpen && (
                <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
                    <button
                        onClick={() => setIsModalOpen(false)}
                        className="absolute top-2 right-2 sm:top-4 sm:right-4 text-white hover:text-gray-300 focus:outline-none z-10"
                        aria-label="Close"
                    >
                        <X className="h-6 w-6 sm:h-8 sm:w-8" />
                    </button>

                    <div
                        className="w-full max-w-xl sm:max-w-2xl md:max-w-3xl"
                        style={aspectRatioStyle()}
                    >
                        {videoType !== "self-hosted" ? (
                            // YouTube or Vimeo video
                            <iframe
                                src={getEmbedUrl()}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        ) : (
                            // Self-hosted video
                            <video
                                src={videoUrl}
                                controls
                                autoPlay
                                className="w-full h-full"
                            >
                                Your browser does not support the video tag.
                            </video>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
