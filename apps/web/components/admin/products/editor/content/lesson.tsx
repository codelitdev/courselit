"use client";

import React, { useState, useEffect, ChangeEvent } from "react";
import {
    BUTTON_SAVE,
    DOWNLOADABLE_SWITCH,
    TYPE_DROPDOWN,
    LESSON_CONTENT_HEADER,
    CONTENT_URL_LABEL,
    LESSON_PREVIEW,
    DELETE_LESSON_POPUP_HEADER,
    APP_MESSAGE_LESSON_DELETED,
    BUTTON_NEW_LESSON_TEXT,
    EDIT_LESSON_TEXT,
    BUTTON_DELETE_LESSON_TEXT,
    LESSON_PREVIEW_TOOLTIP,
    LESSON_CONTENT_EMBED_HEADER,
    LESSON_CONTENT_EMBED_PLACEHOLDER,
    BUTTON_SAVING,
    MANAGE_COURSES_PAGE_HEADING,
} from "@ui-config/strings";
import {
    LESSON_TYPE_TEXT,
    LESSON_TYPE_AUDIO,
    LESSON_TYPE_VIDEO,
    LESSON_TYPE_PDF,
    LESSON_TYPE_QUIZ,
    LESSON_TYPE_FILE,
    MIMETYPE_VIDEO,
    MIMETYPE_AUDIO,
    MIMETYPE_PDF,
    COURSE_TYPE_COURSE,
    COURSE_TYPE_DOWNLOAD,
    LESSON_TYPE_EMBED,
} from "@ui-config/constants";
import { FetchBuilder, capitalize } from "@courselit/utils";
import { AppMessage, Media, Profile, Quiz } from "@courselit/common-models";
import type { AppDispatch } from "@courselit/state-management";
import type {
    Lesson,
    Address,
    TextEditorContent,
} from "@courselit/common-models";
import { actionCreators } from "@courselit/state-management";
import { useRouter } from "next/navigation";
import useCourse from "../course-hook";
import { Back, Help, Info } from "@courselit/icons";
import {
    Tooltip,
    Link,
    Button,
    Select,
    TextEditor,
    Dialog2,
    MediaSelector,
    Form,
    FormField,
    Switch,
    TextEditorEmptyDoc,
    IconButton,
    Breadcrumbs,
    Skeleton,
} from "@courselit/components-library";
import { QuizBuilder } from "./quiz-builder";

const { networkAction, setAppMessage } = actionCreators;

interface LessonEditorProps {
    courseId: string;
    sectionId: string;
    lessonId?: string;
    profile: Profile;
    dispatch?: AppDispatch;
    address: Address;
    prefix: string;
    isNew: boolean;
}

const LessonEditor = ({
    courseId,
    sectionId,
    lessonId,
    dispatch,
    address,
    profile,
    prefix,
    isNew,
}: LessonEditorProps) => {
    const [loading, setLoading] = useState(false);
    const [lesson, setLesson] = useState<Lesson | undefined>(
        isNew
            ? {
                  lessonId: "",
                  title: "",
                  type: "text",
                  media: {},
                  downloadable: false,
                  requiresEnrollment: true,
                  courseId,
                  groupId: sectionId,
                  content: TextEditorEmptyDoc as unknown as TextEditorContent,
              }
            : undefined,
    );
    const router = useRouter();
    const [refresh, setRefresh] = useState(0);
    const [content, setContent] = useState<{ value: string }>({ value: "" });
    const [textContent, setTextContent] =
        useState<typeof TextEditorEmptyDoc>(TextEditorEmptyDoc);
    const [quizContent, setQuizContent] = useState<Partial<Quiz>>({});
    const [c1, setC1] = useState({
        b1: false,
    });
    const course = useCourse(courseId, address, dispatch);

    useEffect(() => {
        lessonId && loadLesson(lessonId);
    }, [lessonId]);

    useEffect(() => {
        if (course && !lessonId) {
            setLesson(
                Object.assign({}, lesson, {
                    type:
                        course.type?.toUpperCase() === COURSE_TYPE_DOWNLOAD
                            ? LESSON_TYPE_TEXT.toUpperCase()
                            : LESSON_TYPE_FILE.toUpperCase(),
                }),
            );
        }
    }, [course]);

    const loadLesson = async (id: string) => {
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
            dispatch && dispatch(networkAction(true));
            const response = await fetch.exec();
            if (response.lesson) {
                setLesson(response.lesson);
                switch (response.lesson.type.toLowerCase()) {
                    case LESSON_TYPE_TEXT:
                        setTextContent(
                            response.lesson.content || TextEditorEmptyDoc,
                        );
                        setRefresh(refresh + 1);
                        break;
                    case LESSON_TYPE_QUIZ:
                        setQuizContent(response.lesson.content || {});
                        break;
                    default:
                        setContent(response.lesson.content || { value: "" });
                }
            }
        } catch (err: any) {
            dispatch && dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch && dispatch(networkAction(false));
        }
    };

    const onLessonCreate = async (e: React.FormEvent<HTMLButtonElement>) => {
        e.preventDefault();

        if (lesson?.lessonId) {
            await updateLesson();
        } else {
            await createLesson();
        }
    };

    const updateLesson = async () => {
        const query = `
            mutation {
                lesson: updateLesson(lessonData: {
                    id: "${lesson?.lessonId}"
                    title: "${lesson?.title}",
                    downloadable: ${lesson?.downloadable},
                    content: ${formatContentForSending()},
                    requiresEnrollment: ${lesson?.requiresEnrollment}
                }) {
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
            dispatch && dispatch(networkAction(true));
            setLoading(true);
            await fetch.exec();
        } catch (err: any) {
            dispatch && dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch && dispatch(networkAction(false));
            setLoading(false);
        }
    };

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
            dispatch && dispatch(networkAction(true));
            setLoading(true);
            await fetch.exec();
        } catch (err: any) {
            dispatch && dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch && dispatch(networkAction(false));
            setLoading(false);
        }
    };

    const formatContentForSending = () => {
        switch (lesson?.type.toLowerCase()) {
            case LESSON_TYPE_TEXT:
                return JSON.stringify(JSON.stringify(textContent));
            case LESSON_TYPE_QUIZ:
                return JSON.stringify(JSON.stringify(quizContent));
            default:
                return JSON.stringify(JSON.stringify(content));
        }
    };

    const createLesson = async () => {
        const query = `
            mutation {
                lesson: createLesson(lessonData: {
                    title: "${lesson?.title}",
                    downloadable: ${lesson?.downloadable},
                    type: ${lesson?.type.toUpperCase()},
                    content: ${formatContentForSending()},
                    courseId: "${lesson?.courseId}",
                    requiresEnrollment: ${lesson?.requiresEnrollment},
                    groupId: "${lesson?.groupId}"
                }) {
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
            dispatch && dispatch(networkAction(true));
            setLoading(true);
            const response = await fetch.exec();
            if (response.lesson) {
                setLesson(
                    Object.assign({}, lesson, {
                        lessonId: response.lesson.lessonId,
                    }),
                );
            }
        } catch (err: any) {
            dispatch && dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch && dispatch(networkAction(false));
            setLoading(false);
        }
    };

    const onLessonDelete = async (index: number) => {
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
                dispatch && dispatch(networkAction(true));
                setLoading(true);
                const response = await fetch.exec();

                if (response.result) {
                    dispatch &&
                        dispatch(
                            setAppMessage(
                                new AppMessage(APP_MESSAGE_LESSON_DELETED),
                            ),
                        );
                    router.replace(
                        `${prefix}/product/${courseId}${prefix === "/dashboard" ? "/content" : "?tab=Content"}`,
                    );
                }
            } catch (err: any) {
                dispatch &&
                    dispatch(setAppMessage(new AppMessage(err.message)));
            } finally {
                setLoading(false);
            }
        }
    };

    const onLessonDetailsChange = (e: any) =>
        setLesson(
            Object.assign({}, lesson, {
                [e.target.name]:
                    e.target.type === "checkbox"
                        ? !e.target.checked
                        : e.target.value,
            }),
        );

    const getMimeTypesToShow = () => {
        if (
            lesson?.type ===
            String.prototype.toUpperCase.call(LESSON_TYPE_VIDEO)
        ) {
            return MIMETYPE_VIDEO;
        }
        if (
            lesson?.type ===
            String.prototype.toUpperCase.call(LESSON_TYPE_AUDIO)
        ) {
            return MIMETYPE_AUDIO;
        }
        if (
            lesson?.type === String.prototype.toUpperCase.call(LESSON_TYPE_PDF)
        ) {
            return MIMETYPE_PDF;
        }

        return [...MIMETYPE_AUDIO, ...MIMETYPE_VIDEO, ...MIMETYPE_PDF];
    };

    const selectOptions =
        course?.type === COURSE_TYPE_COURSE.toUpperCase()
            ? [
                  {
                      label: capitalize(LESSON_TYPE_FILE),
                      value: String.prototype.toUpperCase.call(
                          LESSON_TYPE_FILE,
                      ),
                  },
                  {
                      label: capitalize(LESSON_TYPE_VIDEO),
                      value: String.prototype.toUpperCase.call(
                          LESSON_TYPE_VIDEO,
                      ),
                  },
                  {
                      label: capitalize(LESSON_TYPE_AUDIO),
                      value: String.prototype.toUpperCase.call(
                          LESSON_TYPE_AUDIO,
                      ),
                  },
                  {
                      label: capitalize(LESSON_TYPE_PDF),
                      value: String.prototype.toUpperCase.call(LESSON_TYPE_PDF),
                  },
                  {
                      label: capitalize(LESSON_TYPE_EMBED),
                      value: String.prototype.toUpperCase.call(
                          LESSON_TYPE_EMBED,
                      ),
                  },
              ]
            : [
                  {
                      label: capitalize(LESSON_TYPE_FILE),
                      value: String.prototype.toUpperCase.call(
                          LESSON_TYPE_FILE,
                      ),
                  },
                  {
                      label: capitalize(LESSON_TYPE_VIDEO),
                      value: String.prototype.toUpperCase.call(
                          LESSON_TYPE_VIDEO,
                      ),
                  },
                  {
                      label: capitalize(LESSON_TYPE_AUDIO),
                      value: String.prototype.toUpperCase.call(
                          LESSON_TYPE_AUDIO,
                      ),
                  },
                  {
                      label: capitalize(LESSON_TYPE_PDF),
                      value: String.prototype.toUpperCase.call(LESSON_TYPE_PDF),
                  },
                  {
                      label: capitalize(LESSON_TYPE_EMBED),
                      value: String.prototype.toUpperCase.call(
                          LESSON_TYPE_EMBED,
                      ),
                  },
              ];
    if (course?.type === COURSE_TYPE_COURSE.toUpperCase()) {
        selectOptions.unshift({
            label: capitalize(LESSON_TYPE_TEXT),
            value: String.prototype.toUpperCase.call(LESSON_TYPE_TEXT),
        });
        selectOptions.push({
            label: capitalize(LESSON_TYPE_QUIZ),
            value: String.prototype.toUpperCase.call(LESSON_TYPE_QUIZ),
        });
    }

    if (isNew || lesson?.lessonId) {
        return (
            <div className="flex flex-col gap-4">
                {prefix === "/dashboard" && (
                    <Breadcrumbs aria-label="lesson-breadcrumbs">
                        <Link href="/dashboard/products">
                            {MANAGE_COURSES_PAGE_HEADING}
                        </Link>
                        <Link href={`/dashboard/product/${courseId}/content`}>
                            {course?.title || "..."}
                        </Link>
                        {EDIT_LESSON_TEXT}
                    </Breadcrumbs>
                )}
                <div className="flex flex-col gap-4 mb-4">
                    <div className="flex items-center mb-4 gap-2">
                        {courseId && (
                            <Tooltip title="Go back to content">
                                <IconButton variant="soft">
                                    <Link
                                        href={`${prefix}/product/${courseId}${prefix === "/dashboard" ? "/content" : "?tab=Content"}`}
                                    >
                                        <Back />
                                    </Link>
                                </IconButton>
                            </Tooltip>
                        )}
                        <h1 className="text-3xl font-semibold ">
                            {lessonId
                                ? EDIT_LESSON_TEXT
                                : BUTTON_NEW_LESSON_TEXT}
                        </h1>
                    </div>
                    <Form
                        onSubmit={onLessonCreate}
                        className="flex flex-col gap-4"
                    >
                        {course?.type?.toLowerCase() === COURSE_TYPE_COURSE && (
                            <Select
                                title={TYPE_DROPDOWN}
                                value={lesson?.type}
                                options={selectOptions}
                                onChange={(value) => {
                                    setLesson(
                                        Object.assign({}, lesson, {
                                            type: value,
                                        }),
                                    );
                                }}
                                disabled={!!lesson?.lessonId}
                            />
                        )}
                        <FormField
                            required
                            label="Title"
                            name="title"
                            value={lesson?.title}
                            onChange={onLessonDetailsChange}
                        />
                        {lesson?.type.toLowerCase() === LESSON_TYPE_TEXT && (
                            <div className="flex flex-col">
                                <h2>{LESSON_CONTENT_HEADER}</h2>
                                <TextEditor
                                    initialContent={textContent}
                                    refresh={refresh}
                                    onChange={(state: any) =>
                                        setTextContent(state)
                                    }
                                    url={address.backend}
                                />
                            </div>
                        )}
                        {lesson?.type.toLowerCase() === LESSON_TYPE_QUIZ && (
                            <QuizBuilder
                                content={quizContent}
                                onChange={(state: any) => setQuizContent(state)}
                            />
                        )}
                        {lesson?.type.toLowerCase() === LESSON_TYPE_EMBED && (
                            <div className="flex flex-col">
                                <FormField
                                    label={LESSON_CONTENT_EMBED_HEADER}
                                    placeholder={
                                        LESSON_CONTENT_EMBED_PLACEHOLDER
                                    }
                                    required
                                    value={content.value}
                                    onChange={(
                                        e: ChangeEvent<HTMLInputElement>,
                                    ) =>
                                        setContent({
                                            value: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        )}
                        {[
                            LESSON_TYPE_VIDEO,
                            LESSON_TYPE_AUDIO,
                            LESSON_TYPE_PDF,
                        ].includes(lesson?.type) && (
                            <div className="flex justify-between items-center">
                                <h2>{DOWNLOADABLE_SWITCH}</h2>
                                <Switch
                                    name="downloadable"
                                    checked={lesson?.downloadable}
                                    onChange={(value: boolean) => {
                                        setLesson(
                                            Object.assign({}, lesson, {
                                                downloadable: value,
                                            }),
                                        );
                                    }}
                                />
                            </div>
                        )}
                        {lesson?.type.toLowerCase() !== LESSON_TYPE_QUIZ && (
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <h2>{LESSON_PREVIEW}</h2>
                                    <Tooltip title={LESSON_PREVIEW_TOOLTIP}>
                                        <Help />
                                    </Tooltip>
                                </div>
                                <Switch
                                    checked={!lesson?.requiresEnrollment}
                                    onChange={(value: boolean) => {
                                        setLesson(
                                            Object.assign({}, lesson, {
                                                requiresEnrollment: !value,
                                            }),
                                        );
                                    }}
                                />
                            </div>
                        )}
                        <div className="flex justify-between">
                            <div className="flex gap-2">
                                <Button
                                    type="submit"
                                    disabled={!lesson?.title || loading}
                                    sx={{ mr: 1 }}
                                >
                                    {loading ? BUTTON_SAVING : BUTTON_SAVE}
                                </Button>
                            </div>
                            <Dialog2
                                title={DELETE_LESSON_POPUP_HEADER}
                                trigger={
                                    <Button className="!bg-red-500">
                                        {BUTTON_DELETE_LESSON_TEXT}
                                    </Button>
                                }
                                onClick={onLessonDelete}
                            ></Dialog2>
                        </div>
                    </Form>
                </div>
                {![
                    String.prototype.toUpperCase.call(LESSON_TYPE_TEXT),
                    String.prototype.toUpperCase.call(LESSON_TYPE_QUIZ),
                    String.prototype.toUpperCase.call(LESSON_TYPE_EMBED),
                ].includes(lesson?.type) && (
                    <div>
                        <MediaSelector
                            disabled={!lesson?.lessonId}
                            title={CONTENT_URL_LABEL}
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
                            mimeTypesToShow={getMimeTypesToShow()}
                            strings={{}}
                            profile={profile}
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
                            <p className="text-sm text-slate-600 flex items-center gap-2">
                                <Info />
                                Set the title of the lesson to enable media
                                upload
                            </p>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col mt-12">
            <Skeleton className="w-[200px] h-[35px] mb-5" />
            <Skeleton className="w-[60px] h-[27px] mb-1" />
            <Skeleton className="w-full h-[38px] mb-4" />
            <Skeleton className="w-[60px] h-[27px] mb-1" />
            <Skeleton className="w-full h-[38px]" />
        </div>
    );
};

export default LessonEditor;
