import React, { useEffect, useState } from "react";
import { FetchBuilder } from "@courselit/utils";
import {
    LESSON_TYPE_VIDEO,
    LESSON_TYPE_AUDIO,
    LESSON_TYPE_PDF,
    LESSON_TYPE_FILE,
    LESSON_TYPE_TEXT,
    LESSON_TYPE_EMBED,
    LESSON_TYPE_QUIZ,
} from "@/ui-config/constants";
import {
    COURSE_PROGRESS_FINISH,
    COURSE_PROGRESS_INTRO,
    COURSE_PROGRESS_NEXT,
    COURSE_PROGRESS_PREV,
    ENROLL_BUTTON_TEXT,
    TOAST_TITLE_ERROR,
    NOT_ENROLLED_HEADER,
} from "@/ui-config/strings";
import {
    TextRenderer,
    Link,
    Button2,
    Skeleton,
    useToast,
} from "@courselit/components-library";
import {
    Constants,
    type Address,
    type Lesson,
    type Profile,
    type Quiz,
} from "@courselit/common-models";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowDownward } from "@courselit/icons";
import { isEnrolled } from "../../../ui-lib/utils";
import LessonEmbedViewer from "./embed-viewer";
import QuizViewer from "./quiz-viewer";
import { getUserProfile } from "@/app/(with-contexts)/helpers";

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
}

export const LessonViewer = ({
    slug,
    lessonId,
    profile,
    setProfile,
    address,
    productId,
}: LessonViewerProps) => {
    const [lesson, setLesson] = useState<Lesson>();
    const [error, setError] = useState();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

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
                lesson: getLessonDetails(id: "${id}") {
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

            if (response.lesson) {
                setLesson(response.lesson);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const markCompleteAndNext = async () => {
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
                if (lesson!.nextLesson) {
                    await updateUserProfile();
                    router.push(
                        `/course/${slug}/${lesson!.courseId}/${
                            lesson!.nextLesson
                        }`,
                    );
                } else {
                    router.push(`/dashboard/my-content`);
                }
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
        <div className="h-full">
            <article className="flex flex-col pb-[100px] lg:max-w-[40rem] xl:max-w-[48rem] mx-auto">
                {!lesson && !error && (
                    <div className="flex flex-col">
                        <Skeleton className="h-12 w-full mb-4" />
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-8 mb-2" />
                    </div>
                )}
                {error && (
                    <div className="flex flex-col ">
                        <h1 className="text-4xl font-semibold mb-4">
                            {NOT_ENROLLED_HEADER}
                        </h1>
                        <p className="mb-4">{error}.</p>
                        {error === "You are not enrolled in the course" && (
                            <Link
                                href={`/checkout?type=${Constants.MembershipEntityType.COURSE}&id=${productId}`}
                            >
                                <Button2>{ENROLL_BUTTON_TEXT}</Button2>
                            </Link>
                        )}
                    </div>
                )}
                {lesson && !error && (
                    <>
                        <header>
                            <h1 className="text-4xl font-semibold mb-4">
                                {lesson.title}
                            </h1>
                        </header>
                        {String.prototype.toUpperCase.call(
                            LESSON_TYPE_VIDEO,
                        ) === lesson.type && (
                            <div>
                                <video
                                    controls
                                    controlsList="nodownload" // eslint-disable-line react/no-unknown-property
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
                                        lesson.media &&
                                        (lesson.media.caption ||
                                            (lesson.media
                                                .originalFileName as string))
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
                                    controlsList="nodownload" // eslint-disable-line react/no-unknown-property
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
                                        lesson.media &&
                                        (lesson.media.caption as string)
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
                                        lesson.media &&
                                        (lesson.media.caption as string)
                                    }
                                />
                            </div>
                        )}
                        {String.prototype.toUpperCase.call(LESSON_TYPE_TEXT) ===
                            lesson.type &&
                            lesson.content && (
                                <TextRenderer json={lesson.content} />
                            )}
                        {String.prototype.toUpperCase.call(
                            LESSON_TYPE_EMBED,
                        ) === lesson.type &&
                            lesson.content && (
                                <LessonEmbedViewer content={lesson.content} />
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
                            lesson.type && (
                            <div>
                                <Link href={lesson.media?.file}>
                                    <Button2 className="flex gap-1 items-center">
                                        <ArrowDownward />
                                        {lesson.media?.originalFileName}
                                    </Button2>
                                </Link>
                            </div>
                        )}
                    </>
                )}
            </article>
            {lesson && isEnrolled(lesson.courseId, profile) && (
                <div className="bg-background fixed bottom-0 left-0 w-full p-4 flex justify-end">
                    <div className="mr-2">
                        {!lesson.prevLesson && (
                            <Link href={`/course/${slug}/${lesson.courseId}`}>
                                <Button2
                                    variant="secondary"
                                    className="flex gap-1 items-center"
                                    disabled={loading}
                                >
                                    <ArrowLeft />
                                    {COURSE_PROGRESS_INTRO}
                                </Button2>
                            </Link>
                        )}
                        {lesson.prevLesson && (
                            <Link
                                href={`/course/${slug}/${lesson.courseId}/${lesson.prevLesson}`}
                            >
                                <Button2
                                    variant="secondary"
                                    className="flex gap-1 items-center"
                                    disabled={loading}
                                >
                                    <ArrowLeft /> {COURSE_PROGRESS_PREV}
                                </Button2>
                            </Link>
                        )}
                    </div>
                    <Button2 onClick={markCompleteAndNext} disabled={loading}>
                        {lesson.nextLesson ? (
                            <div className="flex gap-1 items-center">
                                {COURSE_PROGRESS_NEXT} <ArrowRight />
                            </div>
                        ) : (
                            COURSE_PROGRESS_FINISH
                        )}
                    </Button2>
                </div>
            )}
        </div>
    );
};
