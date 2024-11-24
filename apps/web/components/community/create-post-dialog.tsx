"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Paperclip, Link2, Video, Smile, Image } from "lucide-react";
import { EmojiPicker } from "./emoji-picker";
import { GifSelector } from "./gif-selector";
import { MediaPreview } from "./media-preview";
import { Post } from "@/lib/mockData";

interface MediaItem {
    type: "youtube" | "pdf" | "image" | "video" | "gif";
    url: string;
    title?: string;
    fileSize?: string;
}

interface CreatePostDialogProps {
    onPostCreated: (
        post: Omit<Post, "id" | "likes" | "comments" | "isPinned" | "hasLiked">,
    ) => void;
}

export function CreatePostDialog({ onPostCreated }: CreatePostDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [category, setCategory] = useState("");
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const [isGifSelectorOpen, setIsGifSelectorOpen] = useState(false);
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [errors, setErrors] = useState<{
        title?: string;
        content?: string;
        category?: string;
    }>({});
    const [isPostButtonDisabled, setIsPostButtonDisabled] = useState(true);

    useEffect(() => {
        setIsPostButtonDisabled(title.trim() === "" || content.trim() === "");
    }, [title, content]);

    const handleEmojiSelect = (emoji: string) => {
        setContent((prevContent) => prevContent + emoji);
        setIsEmojiPickerOpen(false);
    };

    const handleGifSelect = (gifUrl: string) => {
        setMedia((prevMedia) => [
            ...prevMedia,
            {
                type: "gif",
                url: gifUrl,
                title: "GIF",
            },
        ]);
        setIsGifSelectorOpen(false);
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            Array.from(files).forEach((file) => {
                const url = URL.createObjectURL(file);
                const isPdf = file.type === "application/pdf";
                const isImage = file.type.startsWith("image/");
                const type = isPdf ? "pdf" : isImage ? "image" : "video";

                setMedia((prevMedia) => [
                    ...prevMedia,
                    {
                        type,
                        url,
                        title: file.name,
                        fileSize: `${(file.size / (1024 * 1024)).toFixed(1)}mb`,
                    },
                ]);
            });
        }
    };

    const handleLinkAdd = (url: string) => {
        setContent((prevContent) => `${prevContent} ${url} `);
    };

    const handleVideoAdd = (url: string) => {
        if (url.includes("youtube.com") || url.includes("youtu.be")) {
            const videoId = url.includes("youtu.be")
                ? url.split("/").pop()
                : url.split("v=")[1]?.split("&")[0];

            if (videoId) {
                setMedia((prevMedia) => [
                    ...prevMedia,
                    {
                        type: "youtube",
                        url: `https://www.youtube.com/embed/${videoId}`,
                        title: "YouTube Video",
                    },
                ]);
            }
        } else {
            setContent((prevContent) => `${prevContent} ${url} `);
        }
    };

    const handleMediaRemove = (index: number) => {
        setMedia((prevMedia) => prevMedia.filter((_, i) => i !== index));
    };

    const handlePost = () => {
        if (title.trim() === "" || content.trim() === "") {
            setErrors({
                title: title.trim() === "" ? "Title is required" : undefined,
                content:
                    content.trim() === "" ? "Content is required" : undefined,
            });
            return;
        }

        if (category === "") {
            setErrors((prev) => ({
                ...prev,
                category: "Category is required",
            }));
            return;
        }

        onPostCreated({
            author: "Your Name",
            avatar: "/placeholder.svg",
            time: "Just now",
            category,
            content: `${title}\n\n${content}`,
            media:
                media.length > 0
                    ? {
                          type: media[0].type as
                              | "image"
                              | "video"
                              | "gif"
                              | "youtube",
                          url: media[0].url,
                      }
                    : undefined,
        });
        setIsOpen(false);
        // Reset form
        setTitle("");
        setContent("");
        setCategory("");
        setMedia([]);
        setErrors({});
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="w-full !text-left cursor-text"
                >
                    Write something...
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[90vw] md:max-w-[600px] w-full overflow-y-auto max-h-[calc(100vh-4rem)] my-8">
                <div className="flex items-center gap-2 mb-4">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src="/placeholder.svg" alt="Your avatar" />
                        <AvatarFallback>YN</AvatarFallback>
                    </Avatar>
                    <div>
                        <span className="font-semibold">Your Name</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <Input
                            placeholder="Title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="text-lg border-none px-0 font-semibold"
                        />
                        {errors.title && (
                            <p className="text-red-500 text-sm mt-1">
                                {errors.title}
                            </p>
                        )}
                    </div>
                    <div>
                        <Textarea
                            placeholder="What's on your mind?"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="min-h-[100px] resize-none"
                        />
                        {errors.content && (
                            <p className="text-red-500 text-sm mt-1">
                                {errors.content}
                            </p>
                        )}
                    </div>
                </div>

                {media.length > 0 && (
                    <div className="mt-4 overflow-x-auto">
                        <MediaPreview
                            items={media}
                            onRemove={handleMediaRemove}
                        />
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
                    <div className="flex flex-wrap items-center gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9"
                                >
                                    <Paperclip className="h-5 w-5" />
                                    <span className="sr-only">
                                        Attach files
                                    </span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                                <div className="grid gap-4">
                                    <h4 className="font-medium leading-none">
                                        Attach files
                                    </h4>
                                    <Input
                                        id="file"
                                        type="file"
                                        multiple
                                        accept="image/*,video/*,application/pdf"
                                        onChange={handleFileUpload}
                                    />
                                </div>
                            </PopoverContent>
                        </Popover>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9"
                                >
                                    <Link2 className="h-5 w-5" />
                                    <span className="sr-only">Add link</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                                <div className="grid gap-4">
                                    <h4 className="font-medium leading-none">
                                        Add link
                                    </h4>
                                    <Input
                                        id="link"
                                        type="url"
                                        placeholder="https://example.com"
                                    />
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            const linkInput =
                                                document.getElementById(
                                                    "link",
                                                ) as HTMLInputElement;
                                            handleLinkAdd(linkInput.value);
                                            linkInput.value = "";
                                        }}
                                    >
                                        Add Link
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9"
                                >
                                    <Video className="h-5 w-5" />
                                    <span className="sr-only">Add video</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                                <div className="grid gap-4">
                                    <h4 className="font-medium leading-none">
                                        Add video
                                    </h4>
                                    <Input
                                        id="video"
                                        type="url"
                                        placeholder="https://youtube.com/watch?v="
                                    />
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            const videoInput =
                                                document.getElementById(
                                                    "video",
                                                ) as HTMLInputElement;
                                            handleVideoAdd(videoInput.value);
                                            videoInput.value = "";
                                        }}
                                    >
                                        Add Video
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                        <Popover
                            open={isEmojiPickerOpen}
                            onOpenChange={setIsEmojiPickerOpen}
                        >
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9"
                                >
                                    <Smile className="h-5 w-5" />
                                    <span className="sr-only">Add emoji</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[352px] p-4">
                                <EmojiPicker
                                    onEmojiSelect={handleEmojiSelect}
                                />
                            </PopoverContent>
                        </Popover>
                        <Popover
                            open={isGifSelectorOpen}
                            onOpenChange={setIsGifSelectorOpen}
                        >
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9"
                                >
                                    <Image className="h-5 w-5" />
                                    <span className="sr-only">Add GIF</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                                <GifSelector onGifSelect={handleGifSelect} />
                            </PopoverContent>
                        </Popover>
                        <div>
                            <Select
                                value={category}
                                onValueChange={setCategory}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="general">
                                        General Discussion
                                    </SelectItem>
                                    <SelectItem value="tips">Tips</SelectItem>
                                    <SelectItem value="questions">
                                        Questions
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.category && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors.category}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            onClick={() => setIsOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="px-8"
                            onClick={handlePost}
                            disabled={isPostButtonDisabled}
                        >
                            Post
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
