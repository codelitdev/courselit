"use client";

import { useState, useCallback, useEffect, useContext } from "react";
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
    Info,
    Tv,
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
    BUTTON_NEW_LESSON_TEXT,
    COURSE_CONTENT_HEADER,
    EDIT_LESSON_TEXT,
    MANAGE_COURSES_PAGE_HEADING,
    TOAST_TITLE_ERROR,
    TOAST_TITLE_SUCCESS,
    TEXT_EDITOR_PLACEHOLDER,
} from "@ui-config/strings";
import DashboardContent from "@components/admin/dashboard-content";
import useProduct from "@/hooks/use-product";
import { AddressContext, ProfileContext } from "@components/contexts";
import {
    Constants,
    Lesson,
    LessonType,
    Media,
    Profile,
    Quiz,
    TextEditorContent,
    UIConstants,
} from "@courselit/common-models";
import { MediaSelector, useToast } from "@courselit/components-library";
import {
    MIMETYPE_VIDEO,
    MIMETYPE_AUDIO,
    MIMETYPE_PDF,
} from "@ui-config/constants";
import { FetchBuilder } from "@courselit/utils";
import { QuizBuilder } from "@components/admin/products/quiz-builder";
import { isTextEditorNonEmpty, truncate } from "@ui-lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@components/ui/separator";
import { Editor, emptyDoc as TextEditorEmptyDoc } from "@courselit/text-editor";

const { permissions } = UIConstants;

const lessonTypes = [
    { value: Constants.LessonType.TEXT, label: "Text", icon: FileText },
    { value: Constants.LessonType.VIDEO, label: "Video", icon: Video },
    { value: Constants.LessonType.AUDIO, label: "Audio", icon: Headphones },
    { value: Constants.LessonType.PDF, label: "PDF", icon: FileImage },
    { value: Constants.LessonType.FILE, label: "File", icon: File },
    { value: Constants.LessonType.EMBED, label: "Embed", icon: Tv },
    { value: Constants.LessonType.QUIZ, label: "Quiz", icon: HelpCircle },
] as const;

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
    const [errors, setErrors] = useState<Partial<Record<keyof Lesson, string>>>(
        {},
    );
    const [initialLessonType, setInitialLessonType] =
        useState<LessonType | null>(null);
    const address = useContext(AddressContext);
    const { profile } = useContext(ProfileContext);
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
    const [refresh, setRefresh] = useState(0);
    const [quizContent, setQuizContent] = useState<Partial<Quiz>>({});
    const [textContent, setTextContent] =
        useState<typeof TextEditorEmptyDoc>(TextEditorEmptyDoc);
    const [content, setContent] = useState<{ value: string }>({ value: "" });
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
        courseId: productId,
        groupId: sectionId,
    });
    const [originalLesson, setOriginalLesson] =
        useState<Partial<Lesson> | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [isLoading, setIsLoading] = useState(isEditing);

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

    useEffect(() => {
        if (isEditing) {
            loadLesson(lessonId);
        }
    }, [isEditing]);

    const updateLesson = (updates: Partial<Lesson>) => {
        setLesson((prev) => {
            const newLesson = { ...prev, ...updates };
            if (isEditing && initialLessonType) {
                newLesson.type = initialLessonType;
            }
            return newLesson;
        });
    };

    // const handleAddQuestion = (e: React.MouseEvent<HTMLButtonElement>) => {
    //     e.preventDefault();
    //     const newQuestion = {
    //         id: `q${quizContent.questions?.length + 1}`,
    //         text: "",
    //         options: [],
    //     };
    //     // updateLesson({ questions: [...quizContent.questions, newQuestion] });
    //     setQuizContent((prev) => ({
    //         ...prev,
    //         questions: [...(prev.questions || []), newQuestion]
    //     }));
    //     setExpandedQuestion(newQuestion.id);
    // };

    // const handleAddOption = (questionId: string) => {
    //     setQuizContent((prev) => ({
    //         ...prev,
    //         questions: prev.questions?.map((q) =>
    //             q.id === questionId
    //                 ? { ...q, options: [...q.options, { id: `${questionId}-opt${q.options.length + 1}`, text: "", correctAnswer: false }] }
    //                 : q
    //         )
    //     }))
    //     // updateLesson({
    //     //     questions: lesson.questions.map((q) =>
    //     //         q.id === questionId
    //     //             ? {
    //     //                   ...q,
    //     //                   options: [
    //     //                       ...q.options,
    //     //                       {
    //     //                           id: `${questionId}-opt${q.options.length + 1}`,
    //     //                           text: "",
    //     //                           isCorrect: false,
    //     //                       },
    //     //                   ],
    //     //               }
    //     //             : q,
    //     //     ),
    //     // });
    // };

    const renderLessonContent = () => {
        switch (lesson.type) {
            case Constants.LessonType.TEXT:
                return (
                    <div className="space-y-2">
                        <Editor
                            initialContent={textContent}
                            refresh={refresh}
                            onChange={(state: any) => {
                                setTextContent(state);
                            }}
                            url={address.backend}
                            placeholder={TEXT_EDITOR_PLACEHOLDER}
                        />
                        {errors.content && (
                            <p className="text-sm text-red-500">
                                {errors.content}
                            </p>
                        )}
                    </div>
                );
            case Constants.LessonType.EMBED:
                return (
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <Input
                                placeholder="e.g. YouTube video URL"
                                value={content.value}
                                onChange={(e) =>
                                    // updateLesson({ content: { value: e.target.value } })
                                    setContent({ value: e.target.value })
                                }
                                className={
                                    errors.content ? "border-red-500" : ""
                                }
                            />
                            {/* <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                            <HelpCircle className="h-4 w-4" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>
                                            Enter the YouTube video ID, which is
                                            the part after &quot;v=&quot; in the
                                            URL
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider> */}
                        </div>
                        {errors.content && (
                            <p className="text-sm text-red-500">
                                {errors.content}
                            </p>
                        )}
                        {content.value && (
                            <div className="">
                                {content.value.match(
                                    UIConstants.YOUTUBE_REGEX,
                                ) && (
                                    <div className="aspect-video">
                                        <iframe
                                            className="w-full h-full rounded-lg"
                                            src={`https://www.youtube.com/embed/${content.value.match(UIConstants.YOUTUBE_REGEX)?.[1] ?? ""}`}
                                            title="YouTube video player"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                    </div>
                                )}
                                <a
                                    href={content.value}
                                    className="text-xs lg:text-sm text-muted-foreground text-center hover:underline w-full"
                                >
                                    {content.value}
                                </a>
                            </div>
                        )}
                    </div>
                );
            case Constants.LessonType.QUIZ:
                return (
                    <div className="space-y-4">
                        <QuizBuilder
                            content={quizContent}
                            onChange={(state: any) => {
                                setQuizContent(state);
                            }}
                        />
                        {errors.content && (
                            <p className="text-sm text-red-500">
                                {errors.content}
                            </p>
                        )}
                    </div>
                );
            // return (
            //     <div className="space-y-6">
            //         {quizContent.questions?.map((question, index) => (
            //             <Collapsible
            //                 key={question.id}
            //                 open={expandedQuestion === question.id}
            //                 onOpenChange={() =>
            //                     setExpandedQuestion(question.id)
            //                 }
            //                 className={`border rounded-lg ${errors.questions ? "border-red-500" : ""}`}
            //             >
            //                 <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-accent">
            //                     <div className="flex items-center gap-2">
            //                         <span className="font-medium">
            //                             Question #{index + 1}
            //                         </span>
            //                         <span className="text-muted-foreground">
            //                             {question.text
            //                                 ? `${question.text.substring(0, 50)}...`
            //                                 : "No question text"}
            //                         </span>
            //                     </div>
            //                     {expandedQuestion === question.id ? (
            //                         <ChevronUp className="h-4 w-4" />
            //                     ) : (
            //                         <ChevronDown className="h-4 w-4" />
            //                     )}
            //                 </CollapsibleTrigger>
            //                 <CollapsibleContent className="p-4 pt-0 space-y-4">
            //                     <Input
            //                         placeholder="Enter your question"
            //                         value={question.text}
            //                         onChange={(e) => {
            //                             updateLesson({
            //                                 questions: quizContent.questions?.map(
            //                                     (q) =>
            //                                         q.id === question.id
            //                                             ? {
            //                                                   ...q,
            //                                                   text: e.target
            //                                                       .value,
            //                                               }
            //                                             : q,
            //                                 ),
            //                             });
            //                         }}
            //                         className={
            //                             errors.questions
            //                                 ? "border-red-500"
            //                                 : ""
            //                         }
            //                     />
            //                     <div className="space-y-2">
            //                         {question.options.map((option) => (
            //                             <div
            //                                 key={option.id}
            //                                 className="flex items-center gap-2"
            //                             >
            //                                 <TooltipProvider>
            //                                     <Tooltip>
            //                                         <TooltipTrigger asChild>
            //                                             <div>
            //                                                 <Checkbox
            //                                                     checked={
            //                                                         option.isCorrect
            //                                                     }
            //                                                     onCheckedChange={(
            //                                                         checked,
            //                                                     ) => {
            //                                                         updateLesson(
            //                                                             {
            //                                                                 questions:
            //                                                                     quizContent.questions?.map(
            //                                                                         (
            //                                                                             q,
            //                                                                         ) =>
            //                                                                             q.id ===
            //                                                                             question.id
            //                                                                                 ? {
            //                                                                                       ...q,
            //                                                                                       options:
            //                                                                                           q.options.map(
            //                                                                                               (
            //                                                                                                   opt,
            //                                                                                               ) =>
            //                                                                                                   opt.id ===
            //                                                                                                   option.id
            //                                                                                                       ? {
            //                                                                                                             ...opt,
            //                                                                                                             isCorrect:
            //                                                                                                                 !!checked,
            //                                                                                                         }
            //                                                                                                       : opt,
            //                                                                                           ),
            //                                                                                   }
            //                                                                                 : q,
            //                                                                     ),
            //                                                             },
            //                                                         );
            //                                                     }}
            //                                                 />
            //                                             </div>
            //                                         </TooltipTrigger>
            //                                         <TooltipContent>
            //                                             <p>
            //                                                 Mark as correct
            //                                                 answer
            //                                             </p>
            //                                         </TooltipContent>
            //                                     </Tooltip>
            //                                 </TooltipProvider>
            //                                 <Input
            //                                     placeholder="Enter option text"
            //                                     value={option.text}
            //                                     onChange={(e) => {
            //                                         updateLesson({
            //                                             questions:
            //                                                 quizContent.questions?.map(
            //                                                     (q) =>
            //                                                         q.id ===
            //                                                         question.id
            //                                                             ? {
            //                                                                   ...q,
            //                                                                   options:
            //                                                                       q.options.map(
            //                                                                           (
            //                                                                               opt,
            //                                                                           ) =>
            //                                                                               opt.id ===
            //                                                                               option.id
            //                                                                                   ? {
            //                                                                                         ...opt,
            //                                                                                         text: e
            //                                                                                             .target
            //                                                                                             .value,
            //                                                                                     }
            //                                                                                   : opt,
            //                                                                       ),
            //                                                               }
            //                                                             : q,
            //                                                 ),
            //                                         });
            //                                     }}
            //                                     className="flex-1"
            //                                 />
            //                                 <Button
            //                                     variant="ghost"
            //                                     size="icon"
            //                                     onClick={() => {
            //                                         updateLesson({
            //                                             questions:
            //                                                 quizContent.questions?.map(
            //                                                     (q) =>
            //                                                         q.id ===
            //                                                         question.id
            //                                                             ? {
            //                                                                   ...q,
            //                                                                   options:
            //                                                                       q.options.filter(
            //                                                                           (
            //                                                                               opt,
            //                                                                           ) =>
            //                                                                               opt.id !==
            //                                                                               option.id,
            //                                                                       ),
            //                                                               }
            //                                                             : q,
            //                                                 ),
            //                                         });
            //                                     }}
            //                                 >
            //                                     <X className="h-4 w-4" />
            //                                 </Button>
            //                             </div>
            //                         ))}
            //                         <Button
            //                             variant="outline"
            //                             size="sm"
            //                             onClick={() =>
            //                                 handleAddOption(question.id)
            //                             }
            //                         >
            //                             <Plus className="mr-2 h-4 w-4" />
            //                             Add option
            //                         </Button>
            //                     </div>
            //                 </CollapsibleContent>
            //             </Collapsible>
            //         ))}
            //         <Button onClick={handleAddQuestion} variant="outline">
            //             <Plus className="mr-2 h-4 w-4" />
            //             Add question
            //         </Button>
            //         {errors.content && (
            //             <p className="text-sm text-red-500">
            //                 {errors.content}
            //             </p>
            //         )}
            //     </div>
            // );
            case Constants.LessonType.VIDEO:
            case Constants.LessonType.AUDIO:
            case Constants.LessonType.PDF:
            case Constants.LessonType.FILE:
                return (
                    // <MediaUpload
                    //     type={lesson.type as MediaType}
                    //     value={lesson.mediaUrl}
                    //     caption={lesson.mediaCaption}
                    //     onChange={(value, caption) =>
                    //         updateLesson({
                    //             mediaUrl: value,
                    //             mediaCaption: caption,
                    //         })
                    //     }
                    //     className={errors.content ? "border-red-500" : ""}
                    // />
                    <div className="space-y-2">
                        <MediaSelector
                            disabled={!lesson?.lessonId}
                            title=""
                            src={
                                (lesson?.media && lesson?.media.thumbnail) || ""
                            }
                            srcTitle={
                                (lesson?.media &&
                                    lesson?.media.originalFileName) ||
                                ""
                            }
                            onSelection={(media?: Media) => {
                                if (media) {
                                    setLesson(
                                        Object.assign({}, lesson, {
                                            title:
                                                lesson?.title ||
                                                media.originalFileName,
                                            media,
                                        }),
                                    );
                                    saveMediaContent(media);
                                }
                            }}
                            mimeTypesToShow={
                                lesson.type === Constants.LessonType.VIDEO
                                    ? MIMETYPE_VIDEO
                                    : lesson.type === Constants.LessonType.AUDIO
                                      ? MIMETYPE_AUDIO
                                      : lesson.type === Constants.LessonType.PDF
                                        ? MIMETYPE_PDF
                                        : undefined
                            }
                            strings={{}}
                            profile={profile as Profile}
                            address={address}
                            mediaId={lesson?.media?.mediaId}
                            onRemove={() => {
                                setLesson(
                                    Object.assign({}, lesson, {
                                        media: {},
                                    }),
                                );
                                saveMediaContent();
                            }}
                            type="lesson"
                        />
                        {!(lesson?.lessonId && lesson?.title) && (
                            <p className="text-xs text-muted-foreground flex items-center gap-2">
                                <Info className="w-4 h-4" />
                                Set the title of the lesson to enable media
                                upload
                            </p>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    // const getMimeTypesToShow = () => {
    //     if (
    //         lesson?.type ===
    //         String.prototype.toUpperCase.call(Constants.LessonType.VIDEO)
    //     ) {
    //         return MIMETYPE_VIDEO;
    //     }
    //     if (
    //         lesson?.type ===
    //         String.prototype.toUpperCase.call(Constants.LessonType.AUDIO)
    //     ) {
    //         return MIMETYPE_AUDIO;
    //     }
    //     if (
    //         lesson?.type ===
    //         String.prototype.toUpperCase.call(Constants.LessonType.PDF)
    //     ) {
    //         return MIMETYPE_PDF;
    //     }

    //     return [...MIMETYPE_AUDIO, ...MIMETYPE_VIDEO, ...MIMETYPE_PDF];
    // };

    const saveMediaContent = async (media?: Media) => {
        const query = `
            mutation ($id: ID!, $media: MediaInput) {
                lesson: updateLesson(lessonData: {
                    id: $id
                    media: $media
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
                    media: media
                        ? Object.assign({}, media, {
                              file:
                                  media.access === "public" ? media.file : null,
                          })
                        : null,
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
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
        }
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
                    lessonId
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
                const loadedLesson = Object.assign({}, response.lesson, {
                    type: response.lesson.type.toLowerCase() as LessonType,
                });
                setLesson(JSON.parse(JSON.stringify(loadedLesson)));
                setOriginalLesson(JSON.parse(JSON.stringify(loadedLesson)));
                setInitialLessonType(
                    response.lesson.type.toLowerCase() as LessonType,
                );
                switch (response.lesson.type.toLowerCase()) {
                    case Constants.LessonType.TEXT:
                        setTextContent(
                            response.lesson.content
                                ? response.lesson.content.type &&
                                  response.lesson.content.type === "doc"
                                    ? response.lesson.content
                                    : TextEditorEmptyDoc
                                : TextEditorEmptyDoc,
                        );
                        setRefresh(refresh + 1);
                        break;
                    case Constants.LessonType.QUIZ:
                        setQuizContent(
                            JSON.parse(
                                JSON.stringify(response.lesson.content || {}),
                            ),
                        );
                        break;
                    default:
                        setContent(response.lesson.content || { value: "" });
                }
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

    useEffect(() => {
        if (!originalLesson) return;

        const checkForChanges = () => {
            // Compare current lesson state with original lesson
            const hasLessonChanges = Object.keys(lesson).some((key) => {
                if (key === "content") {
                    // Handle different content types
                    switch (lesson.type?.toLowerCase()) {
                        case Constants.LessonType.TEXT:
                            return (
                                JSON.stringify(textContent) !==
                                JSON.stringify(originalLesson.content)
                            );
                        case Constants.LessonType.QUIZ:
                            return (
                                JSON.stringify(quizContent) !==
                                JSON.stringify(originalLesson.content)
                            );
                        default:
                            return (
                                JSON.stringify(content) !==
                                JSON.stringify(originalLesson.content)
                            );
                    }
                }
                if (key === "media") {
                    return false;
                }
                return (
                    lesson[key as keyof Lesson] !==
                    originalLesson[key as keyof Lesson]
                );
            });

            setHasChanges(hasLessonChanges);
        };

        checkForChanges();
    }, [lesson, textContent, quizContent, content, originalLesson]);

    const validateLesson = useCallback((): boolean => {
        const newErrors: Partial<Record<keyof Lesson, string>> = {};

        if (!lesson.title?.trim()) {
            newErrors.title = "Please enter a lesson title.";
        }

        switch (lesson.type) {
            case Constants.LessonType.TEXT:
                if (
                    !isTextEditorNonEmpty(
                        textContent as unknown as TextEditorContent,
                    )
                ) {
                    newErrors.content = "Please enter the lesson content.";
                }
                break;
            case Constants.LessonType.EMBED:
                if (!content.value.trim()) {
                    newErrors.content = "Please enter a YouTube video ID.";
                }
                break;
            case Constants.LessonType.QUIZ:
                if (quizContent.questions?.length === 0) {
                    newErrors.content =
                        "Please add at least one question to the quiz.";
                } else {
                    for (const question of quizContent.questions!) {
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
            // case Constants.LessonType.VIDEO:
            // case Constants.LessonType.AUDIO:
            // case Constants.LessonType.PDF:
            // case Constants.LessonType.FILE:
            //     if (!lesson.mediaUrl) {
            //         newErrors.content = `Please select a ${lesson.type} file.`;
            //     }
            //     break;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [lesson, textContent, quizContent, content]);

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
                        content: formatContentForSending(),
                        requiresEnrollment: lesson?.requiresEnrollment,
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
                        content: formatContentForSending(),
                        courseId: lesson?.courseId,
                        requiresEnrollment: lesson?.requiresEnrollment,
                        groupId: lesson?.groupId,
                    },
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            const response = await fetch.exec();
            if (response.lesson) {
                if (
                    [
                        Constants.LessonType.TEXT,
                        Constants.LessonType.EMBED,
                        Constants.LessonType.QUIZ,
                    ].includes(lesson.type as any)
                ) {
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

    const formatContentForSending = () => {
        switch (lesson?.type?.toLowerCase()) {
            case Constants.LessonType.TEXT:
                return JSON.stringify(textContent);
            case Constants.LessonType.QUIZ:
                return JSON.stringify(quizContent);
            default:
                return JSON.stringify(content);
        }
    };

    // Add skeleton component
    const LessonSkeleton = () => (
        <div className="space-y-8 animate-pulse">
            <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    {[...Array(7)].map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full rounded-md" />
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-10 w-full" />
            </div>

            <div className="space-y-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-[200px] w-full" />
            </div>

            <div className="flex items-center justify-between pt-6">
                <Skeleton className="h-10 w-24" />
                <div className="space-x-2">
                    <Skeleton className="h-10 w-24 inline-block" />
                    <Skeleton className="h-10 w-24 inline-block" />
                </div>
            </div>
        </div>
    );

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
                                        ({ value, label, icon: Icon }) => (
                                            <Label
                                                key={value}
                                                htmlFor={value}
                                                className={`flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary ${
                                                    lesson.type === value
                                                        ? "border-primary"
                                                        : ""
                                                } ${isEditing && value !== initialLessonType ? "opacity-50 cursor-not-allowed" : ""}`}
                                            >
                                                <RadioGroupItem
                                                    value={value}
                                                    id={value}
                                                    className="sr-only"
                                                    disabled={
                                                        isEditing &&
                                                        value !==
                                                            initialLessonType
                                                    }
                                                />
                                                <Icon className="mb-2 h-6 w-6" />
                                                {label}
                                            </Label>
                                        ),
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
                                            ? "Embed URL"
                                            : `${lesson.type ? lesson.type.charAt(0).toUpperCase() + lesson.type.slice(1) : ""} Content`}
                                    </Label>
                                    {renderLessonContent()}
                                </>
                            )}
                            {/* {renderLessonContent()} */}
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label
                                        htmlFor="preview"
                                        className="font-semibold"
                                    >
                                        Preview
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Allow students to preview this lesson
                                    </p>
                                </div>
                                <Switch
                                    id="preview"
                                    checked={!lesson.requiresEnrollment}
                                    onCheckedChange={(checked) =>
                                        updateLesson({
                                            requiresEnrollment: !checked,
                                        })
                                    }
                                />
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
                                <Button
                                    type="submit"
                                    disabled={isEditing && !hasChanges}
                                >
                                    {isEditing ? "Update" : "Save"} Lesson
                                </Button>
                            </div>
                        </div>
                    </form>
                    {[
                        Constants.LessonType.VIDEO,
                        Constants.LessonType.AUDIO,
                        Constants.LessonType.PDF,
                        Constants.LessonType.FILE,
                    ].includes(lesson.type as any) && (
                        <>
                            <Separator />
                            <div className="space-y-4">
                                <Label className="font-semibold">Media</Label>
                                {renderLessonContent()}
                            </div>
                        </>
                    )}
                </>
            )}
        </DashboardContent>
    );
}
