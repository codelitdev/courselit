import React, { useContext, useEffect, useState } from "react";
import { FetchBuilder } from "@courselit/utils";
import {
    LESSON_TYPE_VIDEO,
    LESSON_TYPE_AUDIO,
    LESSON_TYPE_PDF,
    LESSON_TYPE_FILE,
    LESSON_TYPE_TEXT,
    LESSON_TYPE_EMBED,
    LESSON_TYPE_QUIZ,
    LESSON_TYPE_SCORM,
} from "@/ui-config/constants";
import {
    COURSE_PROGRESS_INTRO,
    COURSE_PROGRESS_PREV,
    ENROLL_BUTTON_TEXT,
    TOAST_TITLE_ERROR,
    NOT_ENROLLED_HEADER,
    BTN_MARK_COMPLETE,
    BTN_COMPLETED,
    COURSE_PROGRESS_NEXT_NAV,
    COURSE_PROGRESS_FINISH_NAV,
} from "@/ui-config/strings";
import { Link, Skeleton, useToast } from "@courselit/components-library";
import { TextRenderer } from "@courselit/page-blocks";
import {
    Constants,
    TextEditorContent,
    type Address,
    type Lesson,
    type Profile,
    type Quiz,
} from "@courselit/common-models";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowDownward } from "@courselit/icons";
import { BookOpen, Check } from "lucide-react";
import { isEnrolled, isLessonCompleted } from "../../../ui-lib/utils";
import LessonEmbedViewer from "./embed-viewer";
import QuizViewer from "./quiz-viewer";
import ScormViewer from "./scorm-viewer";
import { getUserProfile } from "@/app/(with-contexts)/helpers";
import WidgetErrorBoundary from "../base-layout/template/widget-error-boundary";
import {
    Button,
    Header1,
    Text1,
    Link as PrimitiveLink,
} from "@courselit/page-primitives";
import { ThemeContext } from "@components/contexts";

interface CaptionProps {
    text: string;
}

const Caption = (props: CaptionProps) => {
    if (!props.text) {
        return null;
    }

    return (
        <div className="flex justify-center">
            <p className="text-sm text-muted-foreground">{props.text}</p>
        </div>
    );
};

interface LessonViewerProps {
    slug: string;
    lessonId: string;
    productId: string;
    profile: Profile;
    setProfile: (profile: Profile) => void;
    address: Address;
    path?: string;
}

export const LessonViewer = ({
    slug,
    lessonId,
    profile,
    setProfile,
    address,
    productId,
    path = "/course",
}: LessonViewerProps) => {
    const [lesson, setLesson] = useState<Lesson>();
    const [error, setError] = useState();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const { theme } = useContext(ThemeContext);
    const [courseTitle, setCourseTitle] = useState("");

    useEffect(() => {
        setError(undefined);
        setLesson(undefined);
        if (lessonId) {
            loadLesson(lessonId);
        }
    }, [lessonId]);

    const loadLesson = async (id: string) => {
        const query = `
            query {
                lesson: getLessonDetails(id: "${id}", courseId: "${productId}") {
                    lessonId,
                    title,
                    downloadable,
                    type,
                    content,
                    media {
                    file,
                    caption,
                    originalFileName
                    },
                    requiresEnrollment,
                    courseId,
                    prevLesson,
                    nextLesson
                }
                course: getCourse(id: "${productId}") {
                    title
                }
            }
        `;

        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            setLoading(true);
            const response = await fetch.exec();

            if (response.lesson) {
                setLesson(response.lesson);
            }
            if (response.course?.title) {
                setCourseTitle(response.course.title);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const markComplete = async () => {
        const query = `
        mutation {
            result: markLessonCompleted(id: "${lesson!.lessonId}")
        }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            setLoading(true);
            const response = await fetch.exec();

            if (response.result) {
                await updateUserProfile();
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const goToNextLesson = () => {
        if (lesson!.nextLesson) {
            router.push(
                `${path}/${slug}/${lesson!.courseId}/${lesson!.nextLesson}`,
            );
        } else {
            router.push(`/dashboard/my-content`);
        }
    };

    async function updateUserProfile() {
        try {
            setLoading(true);
            const profile = await getUserProfile(address.backend);
            if (profile) {
                setProfile(profile);
            }
        } catch (err) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="relative min-h-[calc(100vh-10rem)] text-foreground pb-24">
            <article className="flex flex-col pb-[100px] lg:max-w-[40rem] xl:max-w-[48rem] mx-auto w-full min-w-0">
                {!lesson && !error && (
                    <div className="flex flex-col">
                        <Skeleton className="h-12 w-full mb-8" />
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-8 mb-2" />
                    </div>
                )}
                {error && (
                    <div className="flex flex-col ">
                        <header className="mb-8">
                            <Header1 theme={theme.theme}>
                                {NOT_ENROLLED_HEADER}
                            </Header1>
                        </header>
                        <Text1 theme={theme.theme} className="mb-4">
                            {error}.
                        </Text1>
                        {error === "You are not enrolled in the course" && (
                            <Link
                                href={`/checkout?type=${Constants.MembershipEntityType.COURSE}&id=${productId}`}
                            >
                                <Button theme={theme.theme}>
                                    {ENROLL_BUTTON_TEXT}
                                </Button>
                            </Link>
                        )}
                    </div>
                )}
                {lesson && !error && (
                    <>
                        {courseTitle && (
                            <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                <BookOpen className="h-4 w-4" />
                                <PrimitiveLink theme={theme.theme}>
                                    <Link
                                        href={`${path}/${slug}/${lesson.courseId}`}
                                    >
                                        {courseTitle}
                                    </Link>
                                </PrimitiveLink>
                            </div>
                        )}
                        <header className="mb-8 w-full">
                            <Header1
                                theme={theme.theme}
                                className="break-words w-full"
                            >
                                {lesson.title}
                            </Header1>
                        </header>
                        {String.prototype.toUpperCase.call(
                            LESSON_TYPE_VIDEO,
                        ) === lesson.type && (
                            <div>
                                <video
                                    controls
                                    controlsList="nodownload"
                                    onContextMenu={(e) => e.preventDefault()}
                                    key={lesson.lessonId}
                                    className="w-full rounded mb-2"
                                >
                                    <source
                                        src={
                                            lesson.media &&
                                            (lesson.media.file as string)
                                        }
                                        type="video/mp4"
                                    />
                                    Your browser does not support the video tag.
                                </video>
                                <Caption
                                    text={
                                        lesson.media?.caption ??
                                        lesson.media?.originalFileName ??
                                        ""
                                    }
                                />
                            </div>
                        )}
                        {String.prototype.toUpperCase.call(
                            LESSON_TYPE_AUDIO,
                        ) === lesson.type && (
                            <div>
                                <audio
                                    controls
                                    controlsList="nodownload"
                                    onContextMenu={(e) => e.preventDefault()}
                                >
                                    <source
                                        src={
                                            lesson.media &&
                                            (lesson.media.file as string)
                                        }
                                        type="audio/mpeg"
                                    />
                                    Your browser does not support the video tag.
                                </audio>
                                <Caption
                                    text={
                                        lesson.media?.caption ??
                                        lesson.media?.originalFileName ??
                                        ""
                                    }
                                />
                            </div>
                        )}
                        {String.prototype.toUpperCase.call(LESSON_TYPE_PDF) ===
                            lesson.type && (
                            <div>
                                <iframe
                                    frameBorder="0"
                                    width="100%"
                                    height="500"
                                    src={`${
                                        lesson.media && lesson.media.file
                                    }#view=fit`}
                                ></iframe>
                                <Caption
                                    text={
                                        lesson.media?.caption ??
                                        lesson.media?.originalFileName ??
                                        ""
                                    }
                                />
                            </div>
                        )}
                        {String.prototype.toUpperCase.call(LESSON_TYPE_TEXT) ===
                            lesson.type &&
                            lesson.content && (
                                <WidgetErrorBoundary widgetName="text-editor">
                                    <TextRenderer
                                        json={
                                            lesson.content as TextEditorContent
                                        }
                                        theme={theme.theme}
                                    />
                                </WidgetErrorBoundary>
                            )}
                        {String.prototype.toUpperCase.call(
                            LESSON_TYPE_EMBED,
                        ) === lesson.type &&
                            lesson.content && (
                                <LessonEmbedViewer
                                    content={
                                        lesson.content as { value: string }
                                    }
                                />
                            )}
                        {String.prototype.toUpperCase.call(LESSON_TYPE_QUIZ) ===
                            lesson.type &&
                            lesson.content && (
                                <QuizViewer
                                    lessonId={lesson.lessonId}
                                    content={lesson.content as Quiz}
                                    address={address}
                                />
                            )}
                        {String.prototype.toUpperCase.call(LESSON_TYPE_FILE) ===
                            lesson.type &&
                            lesson.media?.file && (
                                <div>
                                    <Link href={lesson.media.file}>
                                        <Button
                                            theme={theme.theme}
                                            className="flex gap-1 items-center"
                                        >
                                            <ArrowDownward />
                                            {lesson.media?.originalFileName}
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        {String.prototype.toUpperCase.call(
                            LESSON_TYPE_SCORM,
                        ) === lesson.type &&
                            lesson.content && (
                                <ScormViewer
                                    lessonId={lesson.lessonId}
                                    launchUrl={
                                        (
                                            lesson.content as unknown as {
                                                launchUrl: string;
                                            }
                                        ).launchUrl
                                    }
                                />
                            )}
                        {lesson && isEnrolled(lesson.courseId, profile) && (
                            <div className="mt-8 mb-4">
                                {isLessonCompleted({
                                    courseId: lesson.courseId,
                                    lessonId: lesson.lessonId,
                                    profile,
                                }) ? (
                                    <Button
                                        theme={theme.theme}
                                        disabled
                                        variant="outline"
                                        className="w-full sm:w-auto flex items-center justify-center gap-1.5"
                                    >
                                        <Check className="h-4 w-4" />
                                        {BTN_COMPLETED}
                                    </Button>
                                ) : (
                                    <Button
                                        theme={theme.theme}
                                        onClick={markComplete}
                                        disabled={loading}
                                        className="w-full sm:w-auto"
                                    >
                                        {loading
                                            ? "Marking..."
                                            : BTN_MARK_COMPLETE}
                                    </Button>
                                )}
                            </div>
                        )}
                        {lesson && isEnrolled(lesson.courseId, profile) && (
                            <div className="sticky bottom-6 flex justify-end z-10 w-full mt-8">
                                <div className="mr-2">
                                    {!lesson.prevLesson && (
                                        <Link
                                            href={`${path}/${slug}/${lesson.courseId}`}
                                        >
                                            <Button
                                                theme={theme.theme}
                                                variant="ghost"
                                                className="text-muted-foreground"
                                                disabled={loading}
                                                size="icon"
                                                aria-label={
                                                    COURSE_PROGRESS_INTRO
                                                }
                                            >
                                                <ArrowLeft className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                    )}
                                    {lesson.prevLesson && (
                                        <Link
                                            href={`${path}/${slug}/${lesson.courseId}/${lesson.prevLesson}`}
                                        >
                                            <Button
                                                theme={theme.theme}
                                                variant="ghost"
                                                className="text-muted-foreground"
                                                disabled={loading}
                                                size="icon"
                                                aria-label={
                                                    COURSE_PROGRESS_PREV
                                                }
                                            >
                                                <ArrowLeft className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                                <Button
                                    theme={theme.theme}
                                    onClick={goToNextLesson}
                                    disabled={loading}
                                    size={
                                        lesson.nextLesson ? "icon" : "default"
                                    }
                                    aria-label={
                                        lesson.nextLesson
                                            ? COURSE_PROGRESS_NEXT_NAV
                                            : COURSE_PROGRESS_FINISH_NAV
                                    }
                                >
                                    {lesson.nextLesson ? (
                                        <ArrowRight className="h-4 w-4" />
                                    ) : (
                                        COURSE_PROGRESS_FINISH_NAV
                                    )}
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </article>
        </div>
    );
};
