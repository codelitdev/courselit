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
    ENROLL_IN_THE_COURSE,
    NOT_ENROLLED_HEADER,
} from "../../../ui-config/strings";
import { TextRenderer, Link, Button } from "@courselit/components-library";
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
import Head from "next/head";

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
    const [lesson, setLesson] = useState<Lesson>();
    const router = useRouter();

    useEffect(() => {
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
            if (err.message === "You are not enrolled in the course") {
                setLesson(undefined);
                return;
            }

            dispatch(setAppMessage(new AppMessage(err.message)));
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

    if (!lesson) {
        return (
            <div className="flex flex-col ">
                <h1 className="text-4xl font-semibold mb-4">
                    {NOT_ENROLLED_HEADER}
                </h1>
                <p className="mb-4">{ENROLL_IN_THE_COURSE}</p>
                <Link href={`/checkout/${router.query.id}`}>
                    <Button component="button">{ENROLL_BUTTON_TEXT}</Button>
                </Link>
            </div>
        );
    }

    return (
        <>
            <Head>
                <title>
                    {lesson.title} | {siteinfo.title}
                </title>
                <link
                    rel="icon"
                    href={
                        siteinfo.logo && siteinfo.logo.file
                            ? siteinfo.logo.file
                            : "/favicon.ico"
                    }
                />
                <meta
                    name="viewport"
                    content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no"
                />
            </Head>
            <article className="flex flex-col">
                <header>
                    <h1 className="text-4xl font-semibold mb-4">
                        {lesson.title}
                    </h1>
                </header>
                {String.prototype.toUpperCase.call(LESSON_TYPE_VIDEO) ===
                    lesson.type && (
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
                                    (lesson.media.originalFileName as string))
                            }
                        />
                    </div>
                )}
                {String.prototype.toUpperCase.call(LESSON_TYPE_AUDIO) ===
                    lesson.type && (
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
                                lesson.media && (lesson.media.caption as string)
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
                                lesson.media && (lesson.media.caption as string)
                            }
                        />
                    </div>
                )}
                {String.prototype.toUpperCase.call(LESSON_TYPE_TEXT) ===
                    lesson.type &&
                    lesson.content && <TextRenderer json={lesson.content} />}
                {String.prototype.toUpperCase.call(LESSON_TYPE_EMBED) ===
                    lesson.type &&
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
                            <Button>
                                <ArrowDownward />
                                {lesson.media?.originalFileName}
                            </Button>
                        </Link>
                    </div>
                )}
                {isEnrolled(lesson.courseId, profile) && (
                    <div className="fixed right-0 bottom-0 left-0">
                        <div className="flex justify-end p-4">
                            <div className="mr-2">
                                {!lesson.prevLesson && (
                                    <Link
                                        href={`/course/${slug}/${lesson.courseId}`}
                                    >
                                        <Button
                                            component="button"
                                            variant="soft"
                                        >
                                            <ArrowLeft />{" "}
                                            {COURSE_PROGRESS_INTRO}
                                        </Button>
                                    </Link>
                                )}
                                {lesson.prevLesson && (
                                    <Link
                                        href={`/course/${slug}/${lesson.courseId}/${lesson.prevLesson}`}
                                    >
                                        <Button
                                            component="button"
                                            variant="soft"
                                        >
                                            <ArrowLeft /> {COURSE_PROGRESS_PREV}
                                        </Button>
                                    </Link>
                                )}
                            </div>
                            <Button
                                component="button"
                                onClick={markCompleteAndNext}
                                disabled={loading}
                            >
                                {lesson.nextLesson
                                    ? COURSE_PROGRESS_NEXT
                                    : COURSE_PROGRESS_FINISH}
                                {lesson.nextLesson ? <ArrowRight /> : undefined}
                            </Button>
                        </div>
                    </div>
                )}
            </article>
        </>
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
