"use client";

import { useState, useCallback, useEffect, useContext, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
    Trash2,
    FileText,
    Video,
    Headphones,
    FileImage,
    HelpCircle,
    File,
    Tv,
    Package,
    Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    APP_MESSAGE_LESSON_DELETED,
    BTN_PUBLISH,
    BTN_UNPUBLISH,
    BUTTON_NEW_LESSON_TEXT,
    COURSE_CONTENT_HEADER,
    EDIT_LESSON_TEXT,
    LESSON_EMBED_URL_LABEL,
    LESSON_CONTENT_LABEL,
    LESSON_VISIBILITY,
    LESSON_VISIBILITY_TOOLTIP,
    MANAGE_COURSES_PAGE_HEADING,
    TOAST_TITLE_ERROR,
    TOAST_TITLE_SUCCESS,
    ALPHA_LABEL,
    LESSON_PREVIEW,
    LESSON_MEDIA_LABEL,
    LESSON_DESCRIPTION_LABEL,
    LESSON_DESCRIPTION_TOOLTIP,
    LESSON_DESCRIPTION_PLACEHOLDER,
    LESSON_RESOURCES_LABEL,
    LESSON_RESOURCES_TOOLTIP,
    LESSON_RESOURCES_SAVE_LESSON_FIRST,
    LESSON_RESOURCES_SAVED,
} from "@ui-config/strings";
import DashboardContent from "@components/admin/dashboard-content";
import useProduct from "@/hooks/use-product";
import { AddressContext, ServerConfigContext } from "@components/contexts";
import {
    Constants,
    Lesson,
    LessonType,
    Media,
    TextEditorContent,
    UIConstants,
} from "@courselit/common-models";
import { useToast, Chip } from "@courselit/components-library";
import {
    FetchBuilder,
    lessonTypeSupportsAttachments,
    lessonTypeSupportsDescription,
} from "@courselit/utils";
import { LessonContentRenderer } from "./lesson-content-renderer";
import { isTextEditorNonEmpty, toMediaInput, truncate } from "@ui-lib/utils";
import { Separator } from "@components/ui/separator";
import { Editor, emptyDoc as TextEditorEmptyDoc } from "@courselit/text-editor";
import { LessonSkeleton } from "./skeleton";
import { ScormLessonUpload } from "./scorm-lesson-upload";
import { LessonAttachments } from "./lesson-attachments";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

const { permissions } = UIConstants;

const lessonTypes = [
    { value: Constants.LessonType.TEXT, label: "Text", icon: FileText },
    { value: Constants.LessonType.VIDEO, label: "Video", icon: Video },
    { value: Constants.LessonType.AUDIO, label: "Audio", icon: Headphones },
    { value: Constants.LessonType.PDF, label: "PDF", icon: FileImage },
    { value: Constants.LessonType.FILE, label: "File", icon: File },
    { value: Constants.LessonType.EMBED, label: "Embed", icon: Tv },
    { value: Constants.LessonType.QUIZ, label: "Quiz", icon: HelpCircle },
    { value: Constants.LessonType.SCORM, label: "SCORM", icon: Package },
] as const;

const mediaLessonTypes: LessonType[] = [
    Constants.LessonType.VIDEO,
    Constants.LessonType.AUDIO,
    Constants.LessonType.PDF,
    Constants.LessonType.FILE,
];

type LessonError = Partial<Record<keyof Lesson, string>>;

export default function LessonPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const productId = params.id as string;
    const lessonId = searchParams.get("id");
    const sectionId = params.section as string;
    const isEditing = !!lessonId;
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const { toast } = useToast();
    const [errors, setErrors] = useState<LessonError>({});
    const address = useContext(AddressContext);
    const config = useContext(ServerConfigContext);
    const { product, loaded: productLoaded } = useProduct(productId);
    const breadcrumbs = [
        { label: MANAGE_COURSES_PAGE_HEADING, href: "/dashboard/products" },
        {
            label: product ? truncate(product.title || "", 20) || "..." : "...",
            href: `/dashboard/product/${productId}`,
        },
        {
            label: COURSE_CONTENT_HEADER,
            href: `/dashboard/product/${productId}/content`,
        },
        {
            label: isEditing ? EDIT_LESSON_TEXT : BUTTON_NEW_LESSON_TEXT,
            href: "#",
        },
    ];

    // Use ref to store the originally loaded lesson for comparison
    const loadedLessonRef = useRef<Partial<Lesson> | null>(null);

    const [lesson, setLesson] = useState<Partial<Lesson>>({
        type: product
            ? product.type?.toLowerCase() === UIConstants.COURSE_TYPE_DOWNLOAD
                ? Constants.LessonType.FILE
                : Constants.LessonType.TEXT
            : Constants.LessonType.TEXT,
        title: "",
        content: TextEditorEmptyDoc as unknown as TextEditorContent,
        media: undefined,
        downloadable: false,
        requiresEnrollment: true,
        published: false,
        courseId: productId,
        groupId: sectionId,
    });
    const [content, setContent] = useState<any>(
        lesson.type === Constants.LessonType.TEXT
            ? TextEditorEmptyDoc
            : lesson.type === Constants.LessonType.QUIZ
              ? {}
              : { value: "" },
    );
    const [description, setDescription] = useState<TextEditorContent>(
        TextEditorEmptyDoc as unknown as TextEditorContent,
    );
    const [attachments, setAttachments] = useState<Partial<Media>[]>([]);
    const [savingAttachments, setSavingAttachments] = useState(false);
    const [isLoading, setIsLoading] = useState(isEditing);
    const isMediaLesson = mediaLessonTypes.includes(lesson.type as LessonType);
    const supportsDescription = lessonTypeSupportsDescription(lesson.type);
    const supportsAttachments = lessonTypeSupportsAttachments(lesson.type);

    useEffect(() => {
        if (product && !lesson.lessonId) {
            setLesson({
                ...lesson,
                type:
                    product.type?.toLowerCase() ===
                    UIConstants.COURSE_TYPE_DOWNLOAD
                        ? Constants.LessonType.FILE
                        : Constants.LessonType.TEXT,
            });
        }
    }, [product]);

    const updateLesson = (updates: Partial<Lesson>) => {
        setLesson({ ...lesson, ...updates });
    };

    useEffect(() => {
        lessonId && loadLesson(lessonId);
    }, [lessonId]);

    const loadLesson = async (id: string) => {
        setIsLoading(true);
        const query = `
            query {
                lesson: getLesson(id: "${id}") {
                    title,
                    downloadable,
                    type,
                    content,
                    media {
                        mediaId,
                        originalFileName,
                        mimeType,
                        size,
                        access,
                        file,
                        thumbnail,
                        caption
                    },
                    requiresEnrollment,
                    published,
                    lessonId,
                    description,
                    attachments {
                        mediaId,
                        originalFileName,
                        mimeType,
                        size,
                        access,
                        file,
                        thumbnail,
                        caption
                    }
                }
            }
        `;

        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            const response = await fetch.exec();
            if (response.lesson) {
                const loadedLesson = {
                    ...response.lesson,
                    type: response.lesson.type.toLowerCase() as LessonType,
                    published: response.lesson.published ?? false,
                };

                // Store the loaded lesson in ref for future comparison
                loadedLessonRef.current = loadedLesson;

                setLesson(loadedLesson);
                setContent(response.lesson.content);
                setDescription(
                    (response.lesson.description as TextEditorContent) ??
                        (TextEditorEmptyDoc as unknown as TextEditorContent),
                );
                setAttachments(response.lesson.attachments || []);
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const validateLesson = useCallback((): boolean => {
        const newErrors: Partial<Record<keyof Lesson, string>> = {};

        if (!lesson.title?.trim()) {
            newErrors.title = "Please enter a lesson title.";
        }

        switch (lesson.type) {
            case Constants.LessonType.TEXT:
                if (
                    !isTextEditorNonEmpty(
                        content as unknown as TextEditorContent,
                    )
                ) {
                    newErrors.content = "Please enter the lesson content.";
                }
                break;
            case Constants.LessonType.EMBED:
                if (!content.value?.trim()) {
                    newErrors.content = "Please enter a YouTube video ID.";
                }
                break;
            case Constants.LessonType.QUIZ:
                if (!content.questions || content.questions.length === 0) {
                    newErrors.content =
                        "Please add at least one question to the quiz.";
                } else {
                    for (const question of content.questions) {
                        if (!question.text.trim()) {
                            newErrors.content = "All questions must have text.";
                            break;
                        }
                        if (question.options.length < 2) {
                            newErrors.content =
                                "Each question must have at least two options.";
                            break;
                        }
                        if (
                            !question.options.some(
                                (option) => option.correctAnswer,
                            )
                        ) {
                            newErrors.content =
                                "Each question must have at least one correct answer.";
                            break;
                        }
                    }
                }
                break;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [lesson, content]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateLesson()) {
            return;
        }

        if (lessonId) {
            await updateLessonOnServer();
        } else {
            await createLessonOnServer();
        }
    };

    const updateLessonOnServer = async () => {
        const query = `
            mutation ($lessonData: LessonUpdateInput!) {
                lesson: updateLesson(lessonData: $lessonData) {
                    lessonId
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query,
                variables: {
                    lessonData: {
                        id: lesson?.lessonId,
                        title: lesson?.title,
                        downloadable: lesson?.downloadable,
                        content: JSON.stringify(content),
                        requiresEnrollment: lesson?.requiresEnrollment,
                        published: !!lesson?.published,
                        ...(supportsDescription
                            ? { description: JSON.stringify(description) }
                            : {}),
                    },
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            await fetch.exec();
            toast({
                title: TOAST_TITLE_SUCCESS,
                description: "Lesson updated",
            });
            router.push(`/dashboard/product/${productId}/content`);
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
        }
    };

    const createLessonOnServer = async () => {
        const query = `
            mutation ($lessonData: LessonInput!) {
                lesson: createLesson(lessonData: $lessonData) {
                    lessonId   
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query,
                variables: {
                    lessonData: {
                        title: lesson?.title,
                        downloadable: lesson?.downloadable,
                        type: lesson?.type?.toUpperCase(),
                        content: JSON.stringify(content),
                        courseId: lesson?.courseId,
                        requiresEnrollment: lesson?.requiresEnrollment,
                        groupId: lesson?.groupId,
                        published: !!lesson?.published,
                        ...(supportsDescription
                            ? { description: JSON.stringify(description) }
                            : {}),
                        ...(supportsAttachments ? { attachments } : {}),
                    },
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            const response = await fetch.exec();
            if (response.lesson) {
                // Text and embed lessons now take resources, which can only be
                // added once the lesson exists, so only quizzes skip reopening.
                if (lesson.type === Constants.LessonType.QUIZ) {
                    router.replace(`/dashboard/product/${productId}/content`);
                } else {
                    router.replace(
                        `/dashboard/product/${productId}/content/section/${sectionId}/lesson?id=${response.lesson.lessonId}`,
                    );
                }
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
        }
    };

    // Each save sends the whole list and the server deletes whatever is
    // missing from it, so saves must not overlap.
    const saveAttachments = async (nextAttachments: Partial<Media>[]) => {
        if (savingAttachments) {
            return;
        }

        const previousAttachments = attachments;
        setAttachments(nextAttachments);
        setSavingAttachments(true);

        const query = `
            mutation ($id: ID!, $attachments: [MediaInput]) {
                lesson: updateLesson(lessonData: {
                    id: $id
                    attachments: $attachments
                }) {
                    lessonId
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query,
                variables: {
                    id: lesson?.lessonId,
                    attachments: nextAttachments.map(toMediaInput),
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            await fetch.exec();
            toast({
                title: TOAST_TITLE_SUCCESS,
                description: LESSON_RESOURCES_SAVED,
            });
        } catch (err: any) {
            setAttachments(previousAttachments);
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setSavingAttachments(false);
        }
    };

    const onLessonDelete = async () => {
        if (lesson?.lessonId) {
            const query = `
                mutation r {
                    result: deleteLesson(id: "${lesson.lessonId}")
                }
            `;
            const fetch = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setPayload(query)
                .setIsGraphQLEndpoint(true)
                .build();

            try {
                const response = await fetch.exec();

                if (response.result) {
                    toast({
                        title: TOAST_TITLE_SUCCESS,
                        description: APP_MESSAGE_LESSON_DELETED,
                    });
                    router.replace(`/dashboard/product/${productId}/content`);
                }
            } catch (err: any) {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: err.message,
                    variant: "destructive",
                });
            }
        }
    };

    return (
        <DashboardContent
            breadcrumbs={breadcrumbs}
            permissions={[
                permissions.manageAnyCourse,
                permissions.manageCourse,
            ]}
        >
            <header>
                <h1 className="text-4xl font-semibold">
                    {product?.type?.toLowerCase() ===
                        Constants.CourseType.COURSE &&
                        (isEditing ? "Edit Lesson" : "New Lesson")}
                    {product?.type?.toLowerCase() ===
                        Constants.CourseType.DOWNLOAD &&
                        (isEditing ? "Edit File" : "New File")}
                </h1>
                <p className="text-muted-foreground mt-2">
                    {product?.type?.toLowerCase() ===
                        Constants.CourseType.COURSE &&
                        (isEditing
                            ? "Modify the details of your existing lesson"
                            : "Create a new lesson for your product")}
                    {product?.type?.toLowerCase() ===
                        Constants.CourseType.DOWNLOAD &&
                        (isEditing
                            ? "Modify the details of your existing file"
                            : "Create a new file for your product")}
                </p>
            </header>

            {!productLoaded || (isEditing && isLoading) ? (
                <LessonSkeleton />
            ) : (
                <>
                    <form className="space-y-8 mb-4" onSubmit={handleSave}>
                        {product?.type?.toLowerCase() ===
                            UIConstants.COURSE_TYPE_COURSE && (
                            <div className="space-y-4">
                                <Label className="font-semibold">
                                    Lesson Type
                                </Label>
                                <RadioGroup
                                    value={lesson.type}
                                    onValueChange={(type) => {
                                        if (!isEditing) {
                                            updateLesson({
                                                type: type as LessonType,
                                            });
                                            setErrors({});
                                        }
                                    }}
                                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4"
                                    disabled={isEditing}
                                >
                                    {lessonTypes.map(
                                        ({ value, label, icon: Icon }) => {
                                            const isScormDisabled =
                                                value ===
                                                    Constants.LessonType
                                                        .SCORM &&
                                                !config.cacheEnabled;
                                            const isTypeDisabled =
                                                isEditing &&
                                                value !==
                                                    loadedLessonRef.current?.type?.toLowerCase();
                                            const isDisabled =
                                                isScormDisabled ||
                                                isTypeDisabled;

                                            const cardContent = (
                                                <Label
                                                    key={value}
                                                    htmlFor={
                                                        isDisabled
                                                            ? undefined
                                                            : value
                                                    }
                                                    className={`flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 ${!isDisabled ? "hover:bg-accent hover:text-accent-foreground cursor-pointer" : "opacity-50 cursor-not-allowed"} [&:has([data-state=checked])]:border-primary ${
                                                        lesson.type === value
                                                            ? "border-primary"
                                                            : ""
                                                    }`}
                                                >
                                                    <RadioGroupItem
                                                        value={value}
                                                        id={value}
                                                        className="sr-only"
                                                        disabled={isDisabled}
                                                    />
                                                    <Icon className="mb-2 h-6 w-6" />
                                                    <span className="flex items-center gap-2">
                                                        {label}
                                                        {value ===
                                                            Constants.LessonType
                                                                .SCORM && (
                                                            <Chip>
                                                                {ALPHA_LABEL}
                                                            </Chip>
                                                        )}
                                                    </span>
                                                </Label>
                                            );

                                            if (isScormDisabled) {
                                                return (
                                                    <TooltipProvider
                                                        key={value}
                                                    >
                                                        <Tooltip>
                                                            <TooltipTrigger
                                                                asChild
                                                            >
                                                                {cardContent}
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>
                                                                    Set
                                                                    CACHE_DIR
                                                                    env var to
                                                                    enable SCORM
                                                                </p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                );
                                            }

                                            return cardContent;
                                        },
                                    )}
                                </RadioGroup>
                            </div>
                        )}

                        <div className="space-y-4">
                            <Label htmlFor="title" className="font-semibold">
                                Title
                            </Label>
                            <Input
                                id="title"
                                placeholder="Enter lesson title"
                                value={lesson.title}
                                onChange={(e) =>
                                    updateLesson({ title: e.target.value })
                                }
                                className={errors.title ? "border-red-500" : ""}
                            />
                            {errors.title && (
                                <p className="text-sm text-red-500">
                                    {errors.title}
                                </p>
                            )}
                        </div>

                        <div className="space-y-4">
                            {[
                                Constants.LessonType.TEXT,
                                Constants.LessonType.EMBED,
                                Constants.LessonType.QUIZ,
                            ].includes(lesson.type as any) && (
                                <>
                                    <Label className="font-semibold">
                                        {lesson.type ===
                                        Constants.LessonType.EMBED
                                            ? LESSON_EMBED_URL_LABEL
                                            : LESSON_CONTENT_LABEL}
                                    </Label>
                                    <LessonContentRenderer
                                        lesson={lesson}
                                        errors={errors}
                                        onContentChange={setContent}
                                        onLessonChange={(updates) => {
                                            setLesson(
                                                Object.assign(
                                                    {},
                                                    lesson,
                                                    updates,
                                                ),
                                            );
                                        }}
                                    />
                                </>
                            )}
                            {isMediaLesson && (
                                <>
                                    <Label className="font-semibold">
                                        {LESSON_MEDIA_LABEL}
                                    </Label>
                                    <LessonContentRenderer
                                        lesson={lesson}
                                        errors={errors}
                                        onContentChange={setContent}
                                        onLessonChange={(updates) => {
                                            setLesson(
                                                Object.assign(
                                                    {},
                                                    lesson,
                                                    updates,
                                                ),
                                            );
                                        }}
                                    />
                                </>
                            )}
                            {supportsDescription && (
                                <>
                                    <Separator />
                                    <div className="space-y-0.5">
                                        <Label className="font-semibold">
                                            {LESSON_DESCRIPTION_LABEL}
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            {LESSON_DESCRIPTION_TOOLTIP}
                                        </p>
                                    </div>
                                    <Editor
                                        initialContent={description}
                                        onChange={(state: any) => {
                                            setDescription(state);
                                        }}
                                        url={address.backend}
                                        placeholder={
                                            LESSON_DESCRIPTION_PLACEHOLDER
                                        }
                                    />
                                </>
                            )}
                            {supportsAttachments && (
                                <>
                                    <Separator />
                                    <div className="space-y-0.5">
                                        <Label className="font-semibold">
                                            {LESSON_RESOURCES_LABEL}
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            {LESSON_RESOURCES_TOOLTIP}
                                        </p>
                                    </div>
                                    <LessonAttachments
                                        attachments={attachments}
                                        disabled={
                                            !lesson.lessonId ||
                                            savingAttachments
                                        }
                                        onChange={saveAttachments}
                                    />
                                    {!lesson.lessonId && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                                            <Info className="w-4 h-4" />
                                            {LESSON_RESOURCES_SAVE_LESSON_FIRST}
                                        </p>
                                    )}
                                </>
                            )}
                            {product?.type?.toLowerCase() ===
                                Constants.CourseType.COURSE &&
                                lesson.type !== Constants.LessonType.QUIZ && (
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label
                                                htmlFor="preview"
                                                className="font-semibold"
                                            >
                                                {LESSON_PREVIEW}
                                            </Label>
                                            <p className="text-sm text-muted-foreground">
                                                Allow students to preview this
                                                lesson without enrolling
                                            </p>
                                        </div>
                                        <Switch
                                            id="preview"
                                            checked={!lesson.requiresEnrollment}
                                            onCheckedChange={(checked) =>
                                                updateLesson({
                                                    requiresEnrollment:
                                                        !checked,
                                                })
                                            }
                                        />
                                    </div>
                                )}
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label
                                        htmlFor="published"
                                        className="font-semibold"
                                    >
                                        {LESSON_VISIBILITY}
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        {LESSON_VISIBILITY_TOOLTIP}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">
                                        {lesson.published
                                            ? BTN_UNPUBLISH
                                            : BTN_PUBLISH}
                                    </span>
                                    <Switch
                                        id="published"
                                        checked={!!lesson.published}
                                        onCheckedChange={(checked) =>
                                            updateLesson({
                                                published: checked,
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-6">
                            <Dialog
                                open={isDeleteDialogOpen}
                                onOpenChange={setIsDeleteDialogOpen}
                            >
                                <DialogTrigger asChild>
                                    <Button variant="outline">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>
                                            Are you sure you want to delete this
                                            lesson?
                                        </DialogTitle>
                                        <DialogDescription>
                                            This action cannot be undone. This
                                            will permanently delete the lesson
                                            {lesson.title &&
                                                ` "${lesson.title}"`}{" "}
                                            and remove it from our servers.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter>
                                        <Button
                                            variant="outline"
                                            onClick={() =>
                                                setIsDeleteDialogOpen(false)
                                            }
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={() => {
                                                setIsDeleteDialogOpen(false);
                                                onLessonDelete();
                                            }}
                                        >
                                            Delete
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                            <div className="space-x-2">
                                <Button variant="outline" asChild>
                                    <Link
                                        href={`/dashboard/product/${productId}/content`}
                                    >
                                        Cancel
                                    </Link>
                                </Button>
                                <Button type="submit">
                                    {isEditing ? "Update" : "Save"} Lesson
                                </Button>
                            </div>
                        </div>
                    </form>
                    {lesson.type === Constants.LessonType.SCORM &&
                        lesson.lessonId && (
                            <>
                                <Separator />
                                <ScormLessonUpload
                                    lessonId={lesson.lessonId}
                                    content={lesson.content as any}
                                    onUploadComplete={(newContent) => {
                                        setLesson({
                                            ...lesson,
                                            content: newContent,
                                        });
                                        setContent(newContent);
                                    }}
                                />
                            </>
                        )}
                </>
            )}
        </DashboardContent>
    );
}
