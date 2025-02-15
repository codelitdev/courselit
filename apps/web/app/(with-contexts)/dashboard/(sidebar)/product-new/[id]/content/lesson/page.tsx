"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
    Trash2,
    Plus,
    ChevronDown,
    ChevronUp,
    X,
    FileText,
    Video,
    Headphones,
    FileImage,
    Youtube,
    HelpCircle,
    File,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MediaUpload, type MediaType } from "@/components/media-upload";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
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
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import {
    BUTTON_NEW_LESSON_TEXT,
    EDIT_PRODUCT_HEADER,
    MANAGE_COURSES_PAGE_HEADING,
} from "@ui-config/strings";
import DashboardContent from "@components/admin/dashboard-content";

interface Question {
    id: string;
    text: string;
    options: Array<{ id: string; text: string; isCorrect: boolean }>;
}

const lessonTypes = [
    { value: "text", label: "Text", icon: FileText },
    { value: "video", label: "Video", icon: Video },
    { value: "audio", label: "Audio", icon: Headphones },
    { value: "pdf", label: "PDF", icon: FileImage },
    { value: "file", label: "File", icon: File },
    { value: "embed", label: "Embed", icon: Youtube },
    { value: "quiz", label: "Quiz", icon: HelpCircle },
] as const;

type LessonType = (typeof lessonTypes)[number]["value"];

interface LessonState {
    type: LessonType;
    title: string;
    content: string;
    embedUrl: string;
    isPreviewEnabled: boolean;
    questions: Question[];
    requiresPassingGrade: boolean;
    passingGrade: string;
    mediaUrl: string | null;
    mediaCaption: string;
}

export default function LessonPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const productId = params.id as string;
    const lessonId = searchParams.get("id");
    const sectionId = searchParams.get("sectionId");
    const isEditing = !!lessonId;
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [expandedQuestion, setExpandedQuestion] = useState("q1");
    const { toast } = useToast();
    const [errors, setErrors] = useState<
        Partial<Record<keyof LessonState, string>>
    >({});
    const [initialLessonType, setInitialLessonType] =
        useState<LessonType | null>(null);
    const breadcrumbs = [
        { label: MANAGE_COURSES_PAGE_HEADING, href: "/dashboard/products" },
        {
            label: EDIT_PRODUCT_HEADER,
            href: `/dashboard/product-new/${productId}`,
        },
        { label: BUTTON_NEW_LESSON_TEXT, href: "#" },
    ];

    const [lesson, setLesson] = useState<LessonState>({
        type: "text",
        title: "",
        content: "",
        embedUrl: "",
        isPreviewEnabled: false,
        questions: [{ id: "q1", text: "", options: [] }],
        requiresPassingGrade: false,
        passingGrade: "70",
        mediaUrl: null,
        mediaCaption: "",
    });

    useEffect(() => {
        if (isEditing) {
            // Simulating fetching lesson data
            const fetchedLesson = {
                type: "video" as LessonType,
                title: "Sample Video Lesson",
                content: "This is sample video lesson content",
                embedUrl: "",
                isPreviewEnabled: false,
                questions: [],
                requiresPassingGrade: false,
                passingGrade: "70",
                mediaUrl: null,
                mediaCaption: "",
            };
            setLesson(fetchedLesson);
            setInitialLessonType(fetchedLesson.type);
        }
    }, [isEditing]);

    const updateLesson = (updates: Partial<LessonState>) => {
        setLesson((prev) => {
            const newLesson = { ...prev, ...updates };
            if (isEditing && initialLessonType) {
                newLesson.type = initialLessonType;
            }
            return newLesson;
        });
    };

    const handleAddQuestion = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        const newQuestion = {
            id: `q${lesson.questions.length + 1}`,
            text: "",
            options: [],
        };
        updateLesson({ questions: [...lesson.questions, newQuestion] });
        setExpandedQuestion(newQuestion.id);
    };

    const handleAddOption = (questionId: string) => {
        updateLesson({
            questions: lesson.questions.map((q) =>
                q.id === questionId
                    ? {
                          ...q,
                          options: [
                              ...q.options,
                              {
                                  id: `${questionId}-opt${q.options.length + 1}`,
                                  text: "",
                                  isCorrect: false,
                              },
                          ],
                      }
                    : q,
            ),
        });
    };

    const renderLessonContent = () => {
        switch (lesson.type) {
            case "text":
                return (
                    <div className="space-y-2">
                        <Textarea
                            id="content"
                            placeholder="Enter the text content of your lesson"
                            value={lesson.content}
                            onChange={(e) =>
                                updateLesson({ content: e.target.value })
                            }
                            className={`min-h-[200px] ${errors.content ? "border-red-500" : ""}`}
                        />
                        {errors.content && (
                            <p className="text-sm text-red-500">
                                {errors.content}
                            </p>
                        )}
                    </div>
                );
            case "embed":
                return (
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <Input
                                placeholder="e.g. dQw4w9WgXcQ"
                                value={lesson.embedUrl}
                                onChange={(e) =>
                                    updateLesson({ embedUrl: e.target.value })
                                }
                                className={
                                    errors.embedUrl ? "border-red-500" : ""
                                }
                            />
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="outline" size="icon">
                                            <HelpCircle className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>
                                            Enter the YouTube video ID, which is
                                            the part after &quot;v=&quot; in the
                                            URL
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        {errors.embedUrl && (
                            <p className="text-sm text-red-500">
                                {errors.embedUrl}
                            </p>
                        )}
                        {lesson.embedUrl && (
                            <div className="aspect-video">
                                <iframe
                                    className="w-full h-full"
                                    src={`https://www.youtube.com/embed/${lesson.embedUrl}`}
                                    title="YouTube video player"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>
                        )}
                    </div>
                );
            case "quiz":
                return (
                    <div className="space-y-6">
                        {lesson.questions.map((question, index) => (
                            <Collapsible
                                key={question.id}
                                open={expandedQuestion === question.id}
                                onOpenChange={() =>
                                    setExpandedQuestion(question.id)
                                }
                                className={`border rounded-lg ${errors.questions ? "border-red-500" : ""}`}
                            >
                                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-accent">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">
                                            Question #{index + 1}
                                        </span>
                                        <span className="text-muted-foreground">
                                            {question.text
                                                ? `${question.text.substring(0, 50)}...`
                                                : "No question text"}
                                        </span>
                                    </div>
                                    {expandedQuestion === question.id ? (
                                        <ChevronUp className="h-4 w-4" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4" />
                                    )}
                                </CollapsibleTrigger>
                                <CollapsibleContent className="p-4 pt-0 space-y-4">
                                    <Input
                                        placeholder="Enter your question"
                                        value={question.text}
                                        onChange={(e) => {
                                            updateLesson({
                                                questions: lesson.questions.map(
                                                    (q) =>
                                                        q.id === question.id
                                                            ? {
                                                                  ...q,
                                                                  text: e.target
                                                                      .value,
                                                              }
                                                            : q,
                                                ),
                                            });
                                        }}
                                        className={
                                            errors.questions
                                                ? "border-red-500"
                                                : ""
                                        }
                                    />
                                    <div className="space-y-2">
                                        {question.options.map((option) => (
                                            <div
                                                key={option.id}
                                                className="flex items-center gap-2"
                                            >
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div>
                                                                <Checkbox
                                                                    checked={
                                                                        option.isCorrect
                                                                    }
                                                                    onCheckedChange={(
                                                                        checked,
                                                                    ) => {
                                                                        updateLesson(
                                                                            {
                                                                                questions:
                                                                                    lesson.questions.map(
                                                                                        (
                                                                                            q,
                                                                                        ) =>
                                                                                            q.id ===
                                                                                            question.id
                                                                                                ? {
                                                                                                      ...q,
                                                                                                      options:
                                                                                                          q.options.map(
                                                                                                              (
                                                                                                                  opt,
                                                                                                              ) =>
                                                                                                                  opt.id ===
                                                                                                                  option.id
                                                                                                                      ? {
                                                                                                                            ...opt,
                                                                                                                            isCorrect:
                                                                                                                                !!checked,
                                                                                                                        }
                                                                                                                      : opt,
                                                                                                          ),
                                                                                                  }
                                                                                                : q,
                                                                                    ),
                                                                            },
                                                                        );
                                                                    }}
                                                                />
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>
                                                                Mark as correct
                                                                answer
                                                            </p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                                <Input
                                                    placeholder="Enter option text"
                                                    value={option.text}
                                                    onChange={(e) => {
                                                        updateLesson({
                                                            questions:
                                                                lesson.questions.map(
                                                                    (q) =>
                                                                        q.id ===
                                                                        question.id
                                                                            ? {
                                                                                  ...q,
                                                                                  options:
                                                                                      q.options.map(
                                                                                          (
                                                                                              opt,
                                                                                          ) =>
                                                                                              opt.id ===
                                                                                              option.id
                                                                                                  ? {
                                                                                                        ...opt,
                                                                                                        text: e
                                                                                                            .target
                                                                                                            .value,
                                                                                                    }
                                                                                                  : opt,
                                                                                      ),
                                                                              }
                                                                            : q,
                                                                ),
                                                        });
                                                    }}
                                                    className="flex-1"
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        updateLesson({
                                                            questions:
                                                                lesson.questions.map(
                                                                    (q) =>
                                                                        q.id ===
                                                                        question.id
                                                                            ? {
                                                                                  ...q,
                                                                                  options:
                                                                                      q.options.filter(
                                                                                          (
                                                                                              opt,
                                                                                          ) =>
                                                                                              opt.id !==
                                                                                              option.id,
                                                                                      ),
                                                                              }
                                                                            : q,
                                                                ),
                                                        });
                                                    }}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                handleAddOption(question.id)
                                            }
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add option
                                        </Button>
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        ))}
                        <Button onClick={handleAddQuestion} variant="outline">
                            <Plus className="mr-2 h-4 w-4" />
                            Add question
                        </Button>
                        {errors.questions && (
                            <p className="text-sm text-red-500">
                                {errors.questions}
                            </p>
                        )}
                    </div>
                );
            case "video":
            case "audio":
            case "pdf":
            case "file":
                return (
                    <MediaUpload
                        type={lesson.type as MediaType}
                        value={lesson.mediaUrl}
                        caption={lesson.mediaCaption}
                        onChange={(value, caption) =>
                            updateLesson({
                                mediaUrl: value,
                                mediaCaption: caption,
                            })
                        }
                        className={errors.content ? "border-red-500" : ""}
                    />
                );
            default:
                return null;
        }
    };

    const validateLesson = useCallback((): boolean => {
        const newErrors: Partial<Record<keyof LessonState, string>> = {};

        if (!lesson.title.trim()) {
            newErrors.title = "Please enter a lesson title.";
        }

        switch (lesson.type) {
            case "text":
                if (!lesson.content.trim()) {
                    newErrors.content = "Please enter the lesson content.";
                }
                break;
            case "embed":
                if (!lesson.embedUrl.trim()) {
                    newErrors.embedUrl = "Please enter a YouTube video ID.";
                }
                break;
            case "quiz":
                if (lesson.questions.length === 0) {
                    newErrors.questions =
                        "Please add at least one question to the quiz.";
                } else {
                    for (const question of lesson.questions) {
                        if (!question.text.trim()) {
                            newErrors.questions =
                                "All questions must have text.";
                            break;
                        }
                        if (question.options.length < 2) {
                            newErrors.questions =
                                "Each question must have at least two options.";
                            break;
                        }
                        if (
                            !question.options.some((option) => option.isCorrect)
                        ) {
                            newErrors.questions =
                                "Each question must have at least one correct answer.";
                            break;
                        }
                    }
                }
                break;
            case "video":
            case "audio":
            case "pdf":
            case "file":
                if (!lesson.mediaUrl) {
                    newErrors.content = `Please select a ${lesson.type} file.`;
                }
                break;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [lesson]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateLesson()) {
            // Implement save logic here
            toast({
                title: "Success",
                description: "Lesson saved successfully.",
            });
            router.push(`/dashboard/product-new/${productId}/content`);
        } else {
            toast({
                title: "Error",
                description: "Please correct the errors in the form.",
                variant: "destructive",
            });
        }
    };

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <header>
                <h1 className="text-3xl font-bold">
                    {isEditing ? "Edit Lesson" : "New Lesson"}
                </h1>
                <p className="text-muted-foreground mt-2">
                    {isEditing
                        ? "Modify the details of your existing lesson"
                        : "Create a new lesson for your course"}
                </p>
            </header>

            <form className="space-y-8" onSubmit={handleSave}>
                <div className="space-y-4">
                    <Label>Lesson Type</Label>
                    <RadioGroup
                        value={lesson.type}
                        onValueChange={(type) =>
                            !isEditing &&
                            updateLesson({ type: type as LessonType })
                        }
                        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4"
                        disabled={isEditing}
                    >
                        {lessonTypes.map(({ value, label, icon: Icon }) => (
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
                                        isEditing && value !== initialLessonType
                                    }
                                />
                                <Icon className="mb-2 h-6 w-6" />
                                {label}
                            </Label>
                        ))}
                    </RadioGroup>
                </div>

                <div className="space-y-4">
                    <Label htmlFor="title">Title</Label>
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
                        <p className="text-sm text-red-500">{errors.title}</p>
                    )}
                </div>

                <div className="space-y-4">
                    <Label>
                        {lesson.type === "embed"
                            ? "YouTube Video ID"
                            : `${lesson.type.charAt(0).toUpperCase() + lesson.type.slice(1)} Content`}
                    </Label>
                    {renderLessonContent()}
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="preview">Preview</Label>
                            <p className="text-sm text-muted-foreground">
                                Allow students to preview this lesson
                            </p>
                        </div>
                        <Switch
                            id="preview"
                            checked={lesson.isPreviewEnabled}
                            onCheckedChange={(checked) =>
                                updateLesson({ isPreviewEnabled: checked })
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
                                    Are you sure you want to delete this lesson?
                                </DialogTitle>
                                <DialogDescription>
                                    This action cannot be undone. This will
                                    permanently delete the lesson
                                    {lesson.title && ` "${lesson.title}"`} and
                                    remove it from our servers.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setIsDeleteDialogOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={() => setIsDeleteDialogOpen(false)}
                                >
                                    Delete
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <div className="space-x-2">
                        <Button variant="outline" asChild>
                            <Link
                                href={`/dashboard/product-new/${productId}/content`}
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
        </DashboardContent>
    );
}
