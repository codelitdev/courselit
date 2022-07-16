import React, { useState, useEffect } from "react";
import { styled } from "@mui/material/styles";
import {
    Button,
    TextField,
    Typography,
    Grid,
    Switch,
    Select,
    FormControl,
    InputLabel,
    MenuItem,
    capitalize,
    Tooltip,
} from "@mui/material";
import {
    BUTTON_SAVE,
    DOWNLOADABLE_SWITCH,
    TYPE_DROPDOWN,
    LESSON_CONTENT_HEADER,
    CONTENT_URL_LABEL,
    LESSON_PREVIEW,
    DELETE_LESSON_POPUP_HEADER,
    POPUP_CANCEL_ACTION,
    POPUP_OK_ACTION,
    APP_MESSAGE_LESSON_DELETED,
    APP_MESSAGE_LESSON_SAVED,
    BUTTON_NEW_LESSON_TEXT,
    EDIT_LESSON_TEXT,
    BUTTON_DELETE_LESSON_TEXT,
    LESSON_PREVIEW_TOOLTIP,
} from "../../../../../ui-config/strings";
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
} from "../../../../../ui-config/constants";
import { FetchBuilder } from "@courselit/utils";
import { connect } from "react-redux";
import { AppMessage } from "@courselit/common-models";
import {
    Section,
    RichText as TextEditor,
    RichText,
} from "@courselit/components-library";
import dynamic from "next/dynamic";
import type { AppDispatch, AppState } from "@courselit/state-management";
import type { Auth, Lesson, Address } from "@courselit/common-models";
import { actionCreators } from "@courselit/state-management";
import Link from "next/link";
import { useRouter } from "next/router";
import useCourse from "../course-hook";
import { Help } from "@mui/icons-material";

const { networkAction, setAppMessage } = actionCreators;

const AppDialog = dynamic(() => import("../../../../public/app-dialog"));
const MediaSelector = dynamic(() => import("../../../media/media-selector"));
const AppLoader = dynamic(() => import("../../../../app-loader"));

interface LessonEditorProps {
    courseId: string;
    sectionId: string;
    lessonId?: string;
    auth: Auth;
    dispatch: AppDispatch;
    address: Address;
}

const LessonEditor = ({
    courseId,
    sectionId,
    lessonId,
    dispatch,
    address,
}: LessonEditorProps) => {
    const emptyLesson: Lesson = Object.assign(
        {},
        {
            id: "",
            title: "",
            type: "",
            content: RichText.emptyState(),
            media: {
                id: "",
                originalFileName: "",
                file: "",
                mimeType: "",
                public: false,
            },
            downloadable: false,
            requiresEnrollment: false,
            courseId,
            groupId: sectionId,
            lessonId: "",
        }
    );
    const [lesson, setLesson] = useState<Lesson>(emptyLesson);
    const router = useRouter();
    const inputLabel: any = React.useRef(null);
    const [labelWidth, setLabelWidth] = React.useState<any>(0);
    const [deleteLessonPopupOpened, setDeleteLessonPopupOpened] =
        useState(false);
    const course = useCourse(courseId);

    useEffect(() => {
        setLabelWidth(inputLabel.current && inputLabel.current.offsetWidth);
    }, [lesson.type]);

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
                })
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
          file,
          originalFileName,
          caption,
          thumbnail
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
            dispatch(networkAction(true));
            const response = await fetch.exec();
            if (response.lesson) {
                setLesson(
                    Object.assign({}, response.lesson, {
                        content: TextEditor.hydrate({
                            data: response.lesson.content,
                        }),
                    })
                );
            }
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    const onLessonCreate = async (e: React.FormEvent<HTMLButtonElement>) => {
        e.preventDefault();

        if (lesson.lessonId) {
            await updateLesson();
        } else {
            await createLesson();
        }
    };

    const updateLesson = async () => {
        const query = `
    mutation {
      lesson: updateLesson(lessonData: {
        id: "${lesson.lessonId}"
        title: "${lesson.title}",
        downloadable: ${lesson.downloadable},
        type: ${lesson.type.toUpperCase()},
        content: "${TextEditor.stringify(lesson.content)}",
        mediaId: ${
            lesson.media && lesson.media.mediaId
                ? '"' + lesson.media.mediaId + '"'
                : null
        },
        requiresEnrollment: ${lesson.requiresEnrollment}
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
            dispatch(networkAction(true));
            await fetch.exec();
            goBackLessonList();
            // dispatch(setAppMessage(new AppMessage(APP_MESSAGE_LESSON_SAVED)));
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    const createLesson = async () => {
        const query = `
    mutation {
      lesson: createLesson(lessonData: {
        title: "${lesson.title}",
        downloadable: ${lesson.downloadable},
        type: ${lesson.type.toUpperCase()},
        content: "${TextEditor.stringify(lesson.content)}",
        mediaId: ${
            lesson.media && lesson.media.mediaId
                ? '"' + lesson.media.mediaId + '"'
                : null
        },
        courseId: "${lesson.courseId}",
        requiresEnrollment: ${lesson.requiresEnrollment},
        groupId: "${lesson.groupId}"
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
            dispatch(networkAction(true));
            await fetch.exec();
            goBackLessonList();
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    const onLessonDelete = async (index: number) => {
        setDeleteLessonPopupOpened(false);

        if (lesson.lessonId) {
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
                dispatch(networkAction(true));
                const response = await fetch.exec();

                if (response.result) {
                    dispatch(
                        setAppMessage(
                            new AppMessage(APP_MESSAGE_LESSON_DELETED)
                        )
                    );
                    router.replace(`/dashboard/product/${courseId}/content`);
                }
            } catch (err: any) {
                dispatch(setAppMessage(new AppMessage(err.message)));
            }
        }
    };

    const onLessonDetailsChange = (e: any) =>
        setLesson(
            Object.assign({}, lesson, {
                [e.target.name]:
                    e.target.type === "checkbox"
                        ? e.target.checked
                        : e.target.value,
            })
        );

    const changeTextContent = (editorState: string) =>
        setLesson(Object.assign({}, lesson, { content: editorState }));

    const closeDeleteLessonPopup = () => setDeleteLessonPopupOpened(false);

    const getMimeTypesToShow = () => {
        if (
            lesson.type === String.prototype.toUpperCase.call(LESSON_TYPE_VIDEO)
        ) {
            return MIMETYPE_VIDEO;
        }
        if (
            lesson.type === String.prototype.toUpperCase.call(LESSON_TYPE_AUDIO)
        ) {
            return MIMETYPE_AUDIO;
        }
        if (
            lesson.type === String.prototype.toUpperCase.call(LESSON_TYPE_PDF)
        ) {
            return MIMETYPE_PDF;
        }
    };

    const goBackLessonList = () =>
        router.replace(`/dashboard/product/${courseId}/content`);

    return (
        <Section>
            {lesson.type && (
                <Grid container direction="column">
                    <Grid item sx={{ mb: 1 }}>
                        <Typography variant="h2">
                            {lessonId
                                ? EDIT_LESSON_TEXT
                                : BUTTON_NEW_LESSON_TEXT}
                        </Typography>
                    </Grid>
                    <Grid item>
                        <form onSubmit={onLessonCreate}>
                            <Grid container direction="column">
                                <Grid item sx={{ mb: 2 }}>
                                    <TextField
                                        required
                                        variant="outlined"
                                        label="Title"
                                        fullWidth
                                        margin="normal"
                                        name="title"
                                        value={lesson.title}
                                        onChange={onLessonDetailsChange}
                                    />
                                </Grid>
                                {course?.type && (
                                    <Grid item sx={{ mb: 2 }}>
                                        <FormControl fullWidth>
                                            <InputLabel id="select-type">
                                                {TYPE_DROPDOWN}
                                            </InputLabel>
                                            <Select
                                                labelId="select-type"
                                                value={lesson.type}
                                                onChange={onLessonDetailsChange}
                                                label="Type"
                                            >
                                                {course?.type ===
                                                    COURSE_TYPE_COURSE.toUpperCase() && (
                                                    <MenuItem
                                                        value={String.prototype.toUpperCase.call(
                                                            LESSON_TYPE_TEXT
                                                        )}
                                                    >
                                                        {capitalize(
                                                            LESSON_TYPE_TEXT
                                                        )}
                                                    </MenuItem>
                                                )}
                                                <MenuItem
                                                    value={String.prototype.toUpperCase.call(
                                                        LESSON_TYPE_VIDEO
                                                    )}
                                                >
                                                    {capitalize(
                                                        LESSON_TYPE_VIDEO
                                                    )}
                                                </MenuItem>
                                                <MenuItem
                                                    value={String.prototype.toUpperCase.call(
                                                        LESSON_TYPE_AUDIO
                                                    )}
                                                >
                                                    {capitalize(
                                                        LESSON_TYPE_AUDIO
                                                    )}
                                                </MenuItem>
                                                <MenuItem
                                                    value={String.prototype.toUpperCase.call(
                                                        LESSON_TYPE_PDF
                                                    )}
                                                >
                                                    {capitalize(
                                                        LESSON_TYPE_PDF
                                                    )}
                                                </MenuItem>
                                                {course?.type ===
                                                    COURSE_TYPE_DOWNLOAD.toUpperCase() && (
                                                    <MenuItem
                                                        value={String.prototype.toUpperCase.call(
                                                            LESSON_TYPE_FILE
                                                        )}
                                                    >
                                                        {capitalize(
                                                            LESSON_TYPE_FILE
                                                        )}
                                                    </MenuItem>
                                                )}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                )}
                                <Grid item sx={{ mb: 2 }}>
                                    {![
                                        String.prototype.toUpperCase.call(
                                            LESSON_TYPE_TEXT
                                        ),
                                        String.prototype.toUpperCase.call(
                                            LESSON_TYPE_QUIZ
                                        ),
                                    ].includes(lesson.type) && (
                                        <div>
                                            <MediaSelector
                                                title={CONTENT_URL_LABEL}
                                                src={
                                                    lesson.media &&
                                                    lesson.media.thumbnail
                                                }
                                                onSelection={(media?: Media) =>
                                                    media &&
                                                    setLesson(
                                                        Object.assign(
                                                            {},
                                                            lesson,
                                                            {
                                                                media,
                                                            }
                                                        )
                                                    )
                                                }
                                                mimeTypesToShow={getMimeTypesToShow()}
                                            />
                                        </div>
                                    )}
                                    {lesson.type.toLowerCase() ===
                                        LESSON_TYPE_TEXT && (
                                        <Grid container direction="column">
                                            <Grid item>
                                                <Typography variant="body1">
                                                    {LESSON_CONTENT_HEADER}
                                                </Typography>
                                            </Grid>
                                            <Grid item>
                                                <TextEditor
                                                    initialContentState={
                                                        lesson.content
                                                    }
                                                    onChange={changeTextContent}
                                                />
                                            </Grid>
                                        </Grid>
                                    )}
                                    {[
                                        LESSON_TYPE_VIDEO,
                                        LESSON_TYPE_AUDIO,
                                        LESSON_TYPE_PDF,
                                    ].includes(lesson.type) && (
                                        <Grid
                                            container
                                            justifyContent="space-between"
                                            alignItems="center"
                                        >
                                            <Grid item>
                                                <Typography variant="body1">
                                                    {DOWNLOADABLE_SWITCH}
                                                </Typography>
                                            </Grid>
                                            <Grid item>
                                                <Switch
                                                    type="checkbox"
                                                    name="downloadable"
                                                    checked={
                                                        lesson.downloadable
                                                    }
                                                    onChange={
                                                        onLessonDetailsChange
                                                    }
                                                />
                                            </Grid>
                                        </Grid>
                                    )}
                                </Grid>
                                <Grid item sx={{ mb: 2 }}>
                                    <Grid
                                        container
                                        justifyContent="space-between"
                                        alignItems="center"
                                    >
                                        <Grid item>
                                            <Grid container>
                                                <Grid item sx={{ mr: 1 }}>
                                                    <Typography
                                                        variant="body1"
                                                        color="textSecondary"
                                                    >
                                                        {LESSON_PREVIEW}
                                                    </Typography>
                                                </Grid>
                                                <Grid item>
                                                    <Tooltip
                                                        title={
                                                            LESSON_PREVIEW_TOOLTIP
                                                        }
                                                    >
                                                        <Help
                                                            color="disabled"
                                                            fontSize="small"
                                                        />
                                                    </Tooltip>
                                                </Grid>
                                            </Grid>
                                        </Grid>
                                        <Grid item>
                                            <Switch
                                                type="checkbox"
                                                name="requiresEnrollment"
                                                checked={
                                                    lesson.requiresEnrollment
                                                }
                                                onChange={onLessonDetailsChange}
                                            />
                                        </Grid>
                                    </Grid>
                                </Grid>
                                <Grid item>
                                    <Grid
                                        container
                                        justifyContent="space-between"
                                    >
                                        <Grid item>
                                            <Button
                                                type="submit"
                                                variant="contained"
                                                disabled={!lesson.title}
                                                sx={{ mr: 1 }}
                                            >
                                                {BUTTON_SAVE}
                                            </Button>
                                            {courseId && (
                                                <Link
                                                    href={`/dashboard/product/${courseId}/content`}
                                                >
                                                    <Button component="a">
                                                        {POPUP_CANCEL_ACTION}
                                                    </Button>
                                                </Link>
                                            )}
                                        </Grid>
                                        <Grid item>
                                            <Button
                                                onClick={(e) =>
                                                    setDeleteLessonPopupOpened(
                                                        true
                                                    )
                                                }
                                                color="error"
                                            >
                                                {BUTTON_DELETE_LESSON_TEXT}
                                            </Button>
                                        </Grid>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </form>
                    </Grid>
                </Grid>
            )}
            <AppDialog
                onOpen={deleteLessonPopupOpened}
                onClose={closeDeleteLessonPopup}
                title={DELETE_LESSON_POPUP_HEADER}
                actions={[
                    {
                        name: POPUP_CANCEL_ACTION,
                        callback: closeDeleteLessonPopup,
                    },
                    { name: POPUP_OK_ACTION, callback: onLessonDelete },
                ]}
            />
        </Section>
    );
};

const mapStateToProps = (state: AppState) => ({
    auth: state.auth,
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(LessonEditor);
