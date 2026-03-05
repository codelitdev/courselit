"use client";

import {
    useState,
    useContext,
    useMemo,
    useEffect,
    useCallback,
    useRef,
} from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { Paperclip, Video, Smile, Image as ImageIcon } from "lucide-react";
import { EmojiPicker } from "./emoji-picker";
import { GifSelector } from "./gif-selector";
import { MediaPreview } from "./media-preview";
import { CommunityMediaTypes, CommunityPost } from "@courselit/common-models";
import { type MediaItem } from "./media-item";
import { ProfileContext } from "@components/contexts";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

const createClientId = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const withClientIds = (items: MediaItem[]) =>
    items.map((item) =>
        item.clientId ? item : { ...item, clientId: createClientId() },
    );

const EMPTY_MEDIA: MediaItem[] = [];

interface CreatePostDialogProps {
    postId?: string;
    title?: string;
    content?: string;
    category?: string;
    media?: MediaItem[];
    trigger?: React.ReactNode;
    hideTrigger?: boolean;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    createPost: (
        post: Pick<CommunityPost, "title" | "content" | "category"> & {
            media: MediaItem[];
            postId?: string;
        },
    ) => void;
    categories: string[];
    isFileUploading: boolean;
    fileUploadProgress: number;
    fileBeingUploadedNumber: number;
}

export default function CreatePostDialog({
    postId,
    title: initialTitle = "",
    content: initialContent = "",
    category: initialCategory = "",
    media: initialMedia = EMPTY_MEDIA,
    trigger,
    hideTrigger = false,
    isOpen: controlledIsOpen,
    onOpenChange: controlledOnOpenChange,
    createPost,
    categories,
    isFileUploading,
    fileUploadProgress,
    fileBeingUploadedNumber = 0,
}: CreatePostDialogProps) {
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const initialMediaWithClientIds = useMemo(
        () => withClientIds(initialMedia),
        [initialMedia],
    );

    // Use controlled state if provided, otherwise use internal state
    const isOpen =
        controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
    const setIsOpen = controlledOnOpenChange || setInternalIsOpen;

    const [title, setTitle] = useState(initialTitle);
    const [content, setContent] = useState(initialContent);
    const [category, setCategory] = useState(initialCategory);
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const [isGifSelectorOpen, setIsGifSelectorOpen] = useState(false);
    const [media, setMedia] = useState<MediaItem[]>(initialMediaWithClientIds);
    const [videoUrl, setVideoUrl] = useState("");
    const [errors, setErrors] = useState<{
        title?: string;
        content?: string;
        category?: string;
    }>({});
    const { profile } = useContext(ProfileContext);
    const [isPosting, setIsPosting] = useState(false);
    const mediaRef = useRef<MediaItem[]>(initialMediaWithClientIds);

    const revokeMediaObjectUrls = useCallback((items: MediaItem[]) => {
        for (const item of items) {
            if (item.file && item.url?.startsWith("blob:")) {
                URL.revokeObjectURL(item.url);
            }
        }
    }, []);

    // Re-sync form state from props whenever the dialog opens with new data
    useEffect(() => {
        if (!isOpen) {
            return;
        }

        revokeMediaObjectUrls(mediaRef.current);
        setTitle(initialTitle);
        setContent(initialContent);
        setCategory(initialCategory);
        setMedia(initialMediaWithClientIds);
        mediaRef.current = initialMediaWithClientIds;
        setVideoUrl("");
        setErrors({});
    }, [
        isOpen,
        initialTitle,
        initialContent,
        initialCategory,
        initialMediaWithClientIds,
        revokeMediaObjectUrls,
    ]);

    useEffect(() => {
        mediaRef.current = media;
    }, [media]);

    useEffect(() => {
        return () => {
            revokeMediaObjectUrls(mediaRef.current);
        };
    }, [revokeMediaObjectUrls]);

    const isPostButtonDisabled = useMemo(
        () =>
            title.trim() === "" ||
            content.trim() === "" ||
            category.trim() === "" ||
            isPosting,
        [title, content, category, isPosting],
    );

    const handleEmojiSelect = useCallback((emoji: string) => {
        setContent((prevContent) => prevContent + emoji);
        setIsEmojiPickerOpen(false);
    }, []);

    const handleGifSelect = useCallback((gifUrl: string) => {
        setMedia((prevMedia) => [
            ...prevMedia,
            {
                type: "gif",
                url: gifUrl,
                title: "GIF",
                clientId: createClientId(),
            },
        ]);
        setIsGifSelectorOpen(false);
    }, []);

    const handleFileUpload = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const files = event.target.files;
            if (files) {
                const nextItems: MediaItem[] = Array.from(files).map((file) => {
                    const url = URL.createObjectURL(file);
                    const isPdf = file.type === "application/pdf";
                    const isImage = file.type.startsWith("image/");
                    const type = isPdf ? "pdf" : isImage ? "image" : "video";

                    return {
                        type,
                        url,
                        title: file.name,
                        file,
                        clientId: createClientId(),
                        fileSize: `${(file.size / (1024 * 1024)).toFixed(1)}mb`,
                    };
                });

                setMedia((prevMedia) => [...prevMedia, ...nextItems]);
            }
        },
        [],
    );

    // const handleLinkAdd = (url: string) => {
    //     setContent((prevContent) => `${prevContent} ${url} `);
    // };

    const handleVideoAdd = useCallback((url: string) => {
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
                        clientId: createClientId(),
                    },
                ]);
            }
        } else {
            setContent((prevContent) => `${prevContent} ${url} `);
        }
    }, []);

    const handleMediaRemove = useCallback((index: number) => {
        setMedia((prevMedia) => {
            const mediaToRemove = prevMedia[index];
            if (mediaToRemove?.file && mediaToRemove.url?.startsWith("blob:")) {
                URL.revokeObjectURL(mediaToRemove.url);
            }

            return prevMedia.filter((_, i) => i !== index);
        });
    }, []);

    const handlePost = async () => {
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

        setIsPosting(true);
        try {
            await createPost({
                postId,
                category,
                title,
                content,
                media,
            });

            resetForm();
        } finally {
            setIsPosting(false);
        }
    };

    const resetForm = useCallback(() => {
        revokeMediaObjectUrls(mediaRef.current);
        setIsOpen(false);
        setTitle(initialTitle);
        setContent(initialContent);
        setCategory(initialCategory);
        setMedia(initialMediaWithClientIds);
        mediaRef.current = initialMediaWithClientIds;
        setVideoUrl("");
        setErrors({});
    }, [
        setIsOpen,
        initialTitle,
        initialContent,
        initialCategory,
        initialMediaWithClientIds,
        revokeMediaObjectUrls,
    ]);

    const uploadableMediaCount = useMemo(() => {
        return media.filter((x) =>
            [
                CommunityMediaTypes.IMAGE,
                CommunityMediaTypes.VIDEO,
                CommunityMediaTypes.PDF,
            ].includes(x.type as any),
        ).length;
    }, [media]);

    if (!profile) {
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {!hideTrigger &&
                (trigger ? (
                    <DialogTrigger asChild>{trigger}</DialogTrigger>
                ) : (
                    <DialogTrigger asChild>
                        <div
                            role="button"
                            tabIndex={0}
                            className="flex items-start w-full rounded-md border border-input bg-background px-3 pt-3 pb-8 text-sm text-muted-foreground ring-offset-background cursor-text hover:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            Write something...
                        </div>
                    </DialogTrigger>
                ))}
            <DialogContent className="sm:max-w-[90vw] md:max-w-[600px] w-full overflow-y-auto max-h-[calc(100vh-4rem)] my-8">
                <DialogHeader>
                    <DialogTitle>
                        <div className="flex items-center gap-2 mb-4">
                            <Avatar className="h-10 w-10">
                                <AvatarImage
                                    src={
                                        profile.avatar
                                            ? profile.avatar.file
                                            : "/courselit_backdrop_square.webp"
                                    }
                                    alt={`${profile.name} avatar`}
                                />
                                <AvatarFallback>
                                    {(profile.name
                                        ? profile.name.charAt(0)
                                        : profile.email!.charAt(0)
                                    ).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <span className="font-semibold">
                                    {profile.name}
                                </span>
                            </div>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <Input
                            placeholder="Title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
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
                        <Popover modal={true}>
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
                        {/* <Popover modal={true}>
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
                        </Popover> */}
                        <Popover modal={true}>
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
                                        value={videoUrl}
                                        onChange={(e) =>
                                            setVideoUrl(e.target.value)
                                        }
                                    />
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            handleVideoAdd(videoUrl);
                                            setVideoUrl("");
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
                            modal={true}
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
                            modal={true}
                        >
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9"
                                >
                                    <ImageIcon className="h-5 w-5" />
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
                                    {categories.map((category) => (
                                        <SelectItem
                                            key={category}
                                            value={category}
                                        >
                                            {category}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.category && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors.category}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                {isFileUploading && uploadableMediaCount > 0 && (
                    <>
                        <p className="text-xs text-muted-foreground">
                            Uploading {fileBeingUploadedNumber} of{" "}
                            {uploadableMediaCount} files -{" "}
                            {Math.round(fileUploadProgress)}%
                        </p>
                        <Progress value={fileUploadProgress} className="h-2" />
                    </>
                )}
                <DialogFooter className="flex space-x-2">
                    <DialogClose asChild>
                        <Button
                            onClick={resetForm}
                            variant="outline"
                            disabled={isPosting}
                        >
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        onClick={handlePost}
                        disabled={isPostButtonDisabled}
                    >
                        {isPosting
                            ? postId
                                ? "Saving..."
                                : "Posting..."
                            : postId
                              ? "Save"
                              : "Post"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
