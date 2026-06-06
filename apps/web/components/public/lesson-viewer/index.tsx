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
    COURSE_PROGRESS_FINISH,
    COURSE_PROGRESS_INTRO,
    COURSE_PROGRESS_NEXT,
    COURSE_PROGRESS_PREV,
    COURSE_PROGRESS_MARK_COMPLETED,
    COURSE_PROGRESS_COMPLETED,
    ENROLL_BUTTON_TEXT,
    TOAST_TITLE_ERROR,
    NOT_ENROLLED_HEADER,
} from "@/ui-config/strings";
import { Link, Skeleton, useToast } from "@courselit/components-library";
import { TextRenderer } from "@courselit/page-blocks";
import {
    Constants,
    TextEditorContent,
    UIConstants,
    type Address,
    type Lesson,
    type Profile,
    type Quiz,
} from "@courselit/common-models";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowDownward } from "@courselit/icons";
import { isEnrolled, isLessonCompleted } from "../../../ui-lib/utils";
import LessonEmbedViewer from "./embed-viewer";
import QuizViewer from "./quiz-viewer";
import ScormViewer from "./scorm-viewer";
import { getUserProfile } from "@/app/(with-contexts)/helpers";
import WidgetErrorBoundary from "../base-layout/template/widget-error-boundary";
import { Button, Header1, Text1 } from "@courselit/page-primitives";
import { ThemeContext } from "@components/contexts";
import NextLink from "next/link";
import { BookOpen, Check } from "lucide-react";
import { checkPermission } from "@courselit/utils";

const { permissions } = UIConstants;

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
    const [courseTitle, setCourseTitle] = useState<string>("");
    const [courseCreatorId, setCourseCreatorId] = useState<string>("");
    const [isManager, setIsManager] = useState(false);
    const [error, setError] = useState();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const { theme } = useContext(ThemeContext);

    const isDiscussionOpen = searchParams?.get("discussion") === "open";
    const canManageCourse =
        isManager ||
        checkPermission(profile?.permissions ?? [], [
            permissions.manageAnyCourse,
        ]) ||
        (courseCreatorId === profile?.userId &&
            checkPermission(profile?.permissions ?? [], [
                permissions.manageCourse,
            ]));

    const isCompleted =
        lesson && profile && profile.purchases
            ? isLessonCompleted({
                  courseId: lesson.courseId,
                  lessonId: lesson.lessonId,
                  profile: profile as Profile,
              })
            : false;

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
                course: getCourse(id: "${productId}") {
                    title
                    creatorId
                    isManager
                }
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

            if (response.course) {
                setCourseTitle(response.course.title || "");
                setCourseCreatorId(response.course.creatorId || "");
                setIsManager(Boolean(response.course.isManager));
            }
            if (response.lesson) {
                setLesson(response.lesson);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const markAsCompleted = async () => {
        if (!lesson) return;
        const query = `
        mutation {
            result: markLessonCompleted(id: "${lesson.lessonId}")
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
        <div
            className={`flex w-full text-foreground min-w-0 justify-center ${
                isDiscussionOpen
                    ? "h-[calc(100vh-4rem)]"
                    : "min-h-[calc(100vh-4rem)]"
            }`}
        >
            <div
                className={`w-full relative flex flex-col ${
                    isDiscussionOpen ? "h-full" : "min-h-[calc(100vh-4rem)]"
                }`}
            >
                <div
                    className={`flex-grow min-w-0 flex flex-col justify-between ${
                        isDiscussionOpen
                            ? "overflow-y-auto max-h-[calc(100vh-4rem)]"
                            : ""
                    }`}
                >
                    <div className="w-full lg:max-w-[40rem] xl:max-w-[48rem] mx-auto">
                        <article className="flex flex-col pb-[100px] w-full px-4 pt-4">
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
                                    {error ===
                                        "You are not enrolled in the course" && (
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
                                    <header className="mb-8 flex flex-col gap-1">
                                        {courseTitle && (
                                            <NextLink
                                                href={`/course/${slug}/${productId}`}
                                                className="flex items-center gap-2 text-sm text-muted-foreground font-semibold hover:text-foreground transition-colors w-fit mb-1"
                                            >
                                                <BookOpen className="h-4 w-4 shrink-0" />
                                                <span>{courseTitle}</span>
                                            </NextLink>
                                        )}
                                        <Header1 theme={theme.theme}>
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
                                                onContextMenu={(e) =>
                                                    e.preventDefault()
                                                }
                                                key={lesson.lessonId}
                                                className="w-full rounded mb-2"
                                            >
                                                <source
                                                    src={
                                                        lesson.media &&
                                                        (lesson.media
                                                            .file as string)
                                                    }
                                                    type="video/mp4"
                                                />
                                                Your browser does not support
                                                the video tag.
                                            </video>
                                            <Caption
                                                text={
                                                    lesson.media?.caption ??
                                                    lesson.media
                                                        ?.originalFileName ??
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
                                                onContextMenu={(e) =>
                                                    e.preventDefault()
                                                }
                                            >
                                                <source
                                                    src={
                                                        lesson.media &&
                                                        (lesson.media
                                                            .file as string)
                                                    }
                                                    type="audio/mpeg"
                                                />
                                                Your browser does not support
                                                the video tag.
                                            </audio>
                                            <Caption
                                                text={
                                                    lesson.media?.caption ??
                                                    lesson.media
                                                        ?.originalFileName ??
                                                    ""
                                                }
                                            />
                                        </div>
                                    )}
                                    {String.prototype.toUpperCase.call(
                                        LESSON_TYPE_PDF,
                                    ) === lesson.type && (
                                        <div>
                                            <iframe
                                                frameBorder="0"
                                                width="100%"
                                                height="500"
                                                src={`${
                                                    lesson.media &&
                                                    lesson.media.file
                                                }#view=fit`}
                                            ></iframe>
                                            <Caption
                                                text={
                                                    lesson.media?.caption ??
                                                    lesson.media
                                                        ?.originalFileName ??
                                                    ""
                                                }
                                            />
                                        </div>
                                    )}
                                    {String.prototype.toUpperCase.call(
                                        LESSON_TYPE_TEXT,
                                    ) === lesson.type &&
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
                                                    lesson.content as {
                                                        value: string;
                                                    }
                                                }
                                            />
                                        )}
                                    {String.prototype.toUpperCase.call(
                                        LESSON_TYPE_QUIZ,
                                    ) === lesson.type &&
                                        lesson.content && (
                                            <QuizViewer
                                                lessonId={lesson.lessonId}
                                                content={lesson.content as Quiz}
                                                address={address}
                                            />
                                        )}
                                    {String.prototype.toUpperCase.call(
                                        LESSON_TYPE_FILE,
                                    ) === lesson.type &&
                                        lesson.media?.file && (
                                            <div>
                                                <Link href={lesson.media.file}>
                                                    <Button
                                                        theme={theme.theme}
                                                        className="flex gap-1 items-center"
                                                    >
                                                        <ArrowDownward />
                                                        {
                                                            lesson.media
                                                                ?.originalFileName
                                                        }
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
                                    {isEnrolled(lesson.courseId, profile) && (
                                        <div className="mt-8 flex flex-col gap-4">
                                            <div className="flex justify-start">
                                                {isCompleted ? (
                                                    <Button
                                                        theme={theme.theme}
                                                        disabled
                                                        className="flex gap-1.5 items-center bg-muted text-muted-foreground opacity-75"
                                                    >
                                                        <Check className="h-4 w-4" />
                                                        {
                                                            COURSE_PROGRESS_COMPLETED
                                                        }
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        theme={theme.theme}
                                                        onClick={
                                                            markAsCompleted
                                                        }
                                                        disabled={loading}
                                                        className="flex gap-1.5 items-center"
                                                    >
                                                        {
                                                            COURSE_PROGRESS_MARK_COMPLETED
                                                        }
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                            {lesson &&
                                (isEnrolled(lesson.courseId, profile) ||
                                    canManageCourse) && (
                                    <div className="sticky bottom-6 z-20 pointer-events-none w-full flex justify-end pointer-events-auto mt-auto pb-6 pr-6">
                                        <div className="flex gap-2">
                                            {lesson.prevLesson ? (
                                                <Link
                                                    href={`${path}/${slug}/${lesson.courseId}/${lesson.prevLesson}`}
                                                >
                                                    <Button
                                                        theme={theme.theme}
                                                        variant="secondary"
                                                        size="icon"
                                                        disabled={loading}
                                                        aria-label={
                                                            COURSE_PROGRESS_PREV
                                                        }
                                                    >
                                                        <ArrowLeft className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                            ) : (
                                                <Link
                                                    href={`${path}/${slug}/${lesson.courseId}`}
                                                >
                                                    <Button
                                                        theme={theme.theme}
                                                        variant="secondary"
                                                        size="icon"
                                                        disabled={loading}
                                                        aria-label={
                                                            COURSE_PROGRESS_INTRO
                                                        }
                                                    >
                                                        <ArrowLeft className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                            )}
                                            {lesson.nextLesson ? (
                                                <Link
                                                    href={`${path}/${slug}/${lesson.courseId}/${lesson.nextLesson}`}
                                                >
                                                    <Button
                                                        theme={theme.theme}
                                                        variant="secondary"
                                                        size="icon"
                                                        disabled={loading}
                                                        aria-label={
                                                            COURSE_PROGRESS_NEXT
                                                        }
                                                    >
                                                        <ArrowRight className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                            ) : (
                                                <Link
                                                    href={`/dashboard/my-content`}
                                                >
                                                    <Button
                                                        theme={theme.theme}
                                                        variant="secondary"
                                                        size="icon"
                                                        disabled={loading}
                                                        aria-label={
                                                            COURSE_PROGRESS_FINISH
                                                        }
                                                    >
                                                        <ArrowRight className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                )}
                        </article>
                    </div>
                </div>
            </div>
        </div>
    );
};
