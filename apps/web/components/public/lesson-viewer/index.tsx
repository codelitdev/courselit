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
} from "../../../ui-config/constants";
import { connect } from "react-redux";
import { actionCreators } from "@courselit/state-management";
import {
    COURSE_PROGRESS_FINISH,
    COURSE_PROGRESS_INTRO,
    COURSE_PROGRESS_NEXT,
    COURSE_PROGRESS_PREV,
    ENROLL_BUTTON_TEXT,
    NOT_ENROLLED_HEADER,
} from "../../../ui-config/strings";
import {
    TextRenderer,
    Link,
    Button2,
    Skeleton,
} from "@courselit/components-library";
import type {
    Address,
    Lesson,
    Profile,
    Quiz,
    SiteInfo,
} from "@courselit/common-models";
import { AppMessage } from "@courselit/common-models";
import type { AppDispatch, AppState } from "@courselit/state-management";
import { useRouter } from "next/router";
import {
    refreshUserProfile,
    setAppMessage,
} from "@courselit/state-management/dist/action-creators";
import { ArrowLeft, ArrowRight, ArrowDownward } from "@courselit/icons";
import { isEnrolled } from "../../../ui-lib/utils";
import LessonEmbedViewer from "./embed-viewer";
import QuizViewer from "./quiz-viewer";
import { useSession } from "next-auth/react";

const { networkAction } = actionCreators;

interface CaptionProps {
    text: string;
}

const Caption = (props: CaptionProps) => {
    if (!props.text) {
        return null;
    }

    return (
        <div className="flex justify-center">
            <p className="text-sm text-slate-500">{props.text}</p>
        </div>
    );
};

interface LessonViewerProps {
    slug: string;
    lessonId: string;
    dispatch: AppDispatch;
    profile: Profile;
    address: Address;
    networkAction: boolean;
    siteinfo: SiteInfo;
}

const LessonViewer = ({
    slug,
    lessonId,
    dispatch,
    profile,
    address,
    siteinfo,
    networkAction: loading,
}: LessonViewerProps) => {
    const { status } = useSession();
    const [lesson, setLesson] = useState<Lesson>();
    const [error, setError] = useState();
    const router = useRouter();

    useEffect(() => {
        if (status === "authenticated") {
            dispatch(actionCreators.signedIn());
            dispatch(actionCreators.authChecked());
        }
        if (status === "unauthenticated") {
            dispatch(actionCreators.authChecked());
        }
    }, [status]);

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
            dispatch(networkAction(true));
            const response = await fetch.exec();

            if (response.lesson) {
                setLesson(response.lesson);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            dispatch(networkAction(false));
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
            dispatch(networkAction(true));
            const response = await fetch.exec();

            if (response.result) {
                if (lesson!.nextLesson) {
                    dispatch(refreshUserProfile());
                    router.push(
                        `/course/${slug}/${lesson!.courseId}/${
                            lesson!.nextLesson
                        }`,
                    );
                } else {
                    router.push(`/my-content`);
                }
            }
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

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
                            <Link href={`/checkout/${router.query.id}`}>
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
                <div className="bg-white fixed bottom-0 left-0 w-full p-4 flex justify-end">
                    <div className="mr-2">
                        {!lesson.prevLesson && (
                            <Link href={`/course/${slug}/${lesson.courseId}`}>
                                <Button2
                                    variant="secondary"
                                    className="flex gap-1 items-center"
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

const mapStateToProps = (state: AppState) => ({
    profile: state.profile,
    address: state.address,
    networkAction: state.networkAction,
    siteinfo: state.siteinfo,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(LessonViewer);
