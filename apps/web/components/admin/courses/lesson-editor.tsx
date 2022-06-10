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
} from "@mui/material";
import {
    BUTTON_SAVE,
    BUTTON_DELETE_LESSON_TEXT,
    DOWNLOADABLE_SWITCH,
    TYPE_DROPDOWN,
    LESSON_CONTENT_HEADER,
    CONTENT_URL_LABEL,
    LESSON_REQUIRES_ENROLLMENT,
    DELETE_LESSON_POPUP_HEADER,
    POPUP_CANCEL_ACTION,
    POPUP_OK_ACTION,
    APP_MESSAGE_LESSON_DELETED,
    APP_MESSAGE_LESSON_SAVED,
} from "../../../ui-config/strings";
import {
    LESSON_TYPE_TEXT,
    LESSON_TYPE_AUDIO,
    LESSON_TYPE_VIDEO,
    LESSON_TYPE_PDF,
    LESSON_TYPE_QUIZ,
    MIMETYPE_VIDEO,
    MIMETYPE_AUDIO,
    MIMETYPE_PDF,
} from "../../../ui-config/constants";
import { FetchBuilder } from "@courselit/utils";
import { connect } from "react-redux";
import { AppMessage } from "@courselit/common-models";
import { Section, RichText as TextEditor } from "@courselit/components-library";
import dynamic from "next/dynamic";
import type { AppDispatch, AppState } from "@courselit/state-management";
import type { Auth, Lesson, Address } from "@courselit/common-models";
import { actionCreators } from "@courselit/state-management";

const { networkAction, setAppMessage } = actionCreators;

const PREFIX = "LessonEditor";

const classes = {
    formControl: `${PREFIX}-formControl`,
    controlRow: `${PREFIX}-controlRow`,
    editor: `${PREFIX}-editor`,
    editorLabel: `${PREFIX}-editorLabel`,
    section: `${PREFIX}-section`,
};

const StyledSection = styled(Section)(({ theme }: { theme: any }) => ({
    [`& .${classes.formControl}`]: {
        marginBottom: theme.spacing(2),
        minWidth: "100%",
    },

    [`& .${classes.controlRow}`]: {
        marginTop: theme.spacing(2),
        marginBottom: theme.spacing(2),
        display: "flex",
        alignItems: "center",
    },

    [`& .${classes.editor}`]: {
        border: "1px solid #cacaca",
        borderRadius: "6px",
        padding: "10px 8px",
        maxHeight: 300,
        overflow: "auto",
        marginBottom: theme.spacing(2),
    },

    [`& .${classes.editorLabel}`]: {
        fontSize: "1em",
        marginBottom: theme.spacing(1),
    },

    [`& .${classes.section}`]: {
        background: "white",
        paddingTop: theme.spacing(2),
        paddingBottom: theme.spacing(2),
        paddingLeft: theme.spacing(1),
        paddingRight: theme.spacing(1),
    },
}));

const AppDialog = dynamic(() => import("../../public/app-dialog"));
const MediaSelector = dynamic(() => import("../media/media-selector"));
const AppLoader = dynamic(() => import("../../app-loader"));

interface LessonEditorProps {
    auth: Auth;
    dispatch: AppDispatch;
    lesson: Lesson;
    address: Address;
    onLessonUpdated: (...args: any[]) => void;
}

const LessonEditor = (props: LessonEditorProps) => {
    const { dispatch } = props;
    const [lesson, setLesson] = useState<Lesson>(props.lesson);

    const inputLabel: any = React.useRef(null);
    const [labelWidth, setLabelWidth] = React.useState<any>(0);
    const [deleteLessonPopupOpened, setDeleteLessonPopupOpened] =
        useState(false);

    useEffect(() => {
        setLabelWidth(inputLabel.current && inputLabel.current.offsetWidth);
    }, [lesson.type]);

    useEffect(() => {
        props.lesson.id && loadLesson(props.lesson.id);
    }, [props.lesson.id]);

    useEffect(() => {
        setLesson(props.lesson);
    }, [props.lesson]);

    const loadLesson = async (id: string) => {
        const query = `
    query {
      lesson: getLesson(id: "${id}") {
        id,
        title,
        downloadable,
        type,
        content,
        media {
          id,
          file,
          originalFileName,
          caption,
          thumbnail
        },
        requiresEnrollment
      }
    }
    `;

        const fetch = new FetchBuilder()
            .setUrl(`${props.address.backend}/api/graph`)
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
        } catch (err) {
            // setError(err.message)
        } finally {
            dispatch(networkAction(false));
        }
    };

    const onLessonCreate = async (e: React.FormEvent<HTMLButtonElement>) => {
        e.preventDefault();

        if (lesson.id) {
            await updateLesson();
        } else {
            await createLesson();
        }
    };

    const updateLesson = async () => {
        const query = `
    mutation {
      lesson: updateLesson(lessonData: {
        id: "${lesson.id}"
        title: "${lesson.title}",
        downloadable: ${lesson.downloadable},
        type: ${lesson.type.toUpperCase()},
        content: "${TextEditor.stringify(lesson.content)}",
        mediaId: ${
            lesson.media && lesson.media.id ? '"' + lesson.media.id + '"' : null
        },
        requiresEnrollment: ${lesson.requiresEnrollment}
      }) {
        id,
        title,
        downloadable,
        type,
        content,
        media {
          id,
          file,
          originalFileName,
          caption,
          thumbnail
        },
        requiresEnrollment
      }
    }
    `;
        const fetch = new FetchBuilder()
            .setUrl(`${props.address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            dispatch(networkAction(true));
            await fetch.exec();
            dispatch(setAppMessage(new AppMessage(APP_MESSAGE_LESSON_SAVED)));
            props.onLessonUpdated();
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
            lesson.media && lesson.media.id ? '"' + lesson.media.id + '"' : null
        },
        courseId: "${lesson.courseId}",
        requiresEnrollment: ${lesson.requiresEnrollment},
        groupId: "${lesson.groupId}"
      }) {
        id
      }
    }
    `;
        const fetch = new FetchBuilder()
            .setUrl(`${props.address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            dispatch(networkAction(true));
            const response = await fetch.exec();

            if (response.lesson) {
                setLesson(
                    Object.assign({}, lesson, { id: response.lesson.id })
                );
                props.onLessonUpdated();
                dispatch(
                    setAppMessage(new AppMessage(APP_MESSAGE_LESSON_SAVED))
                );
            }
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    const onLessonDelete = async (index: number) => {
        setDeleteLessonPopupOpened(false);

        if (lesson.id) {
            const query = `
      mutation r {
        result: deleteLesson(id: "${lesson.id}")
      }
      `;
            const fetch = new FetchBuilder()
                .setUrl(`${props.address.backend}/api/graph`)
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
                    props.onLessonUpdated(true);
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

    return (
        <StyledSection>
            {lesson.type && (
                <Grid container direction="column" spacing={2}>
                    <Grid item>
                        <form>
                            <TextField
                                required
                                variant="outlined"
                                label="Title"
                                fullWidth
                                margin="normal"
                                name="title"
                                value={lesson.title}
                                onChange={onLessonDetailsChange}
                                className={classes.formControl}
                            />
                            <FormControl
                                variant="outlined"
                                className={classes.formControl}
                            >
                                <InputLabel ref={inputLabel} id="select-type">
                                    {TYPE_DROPDOWN}
                                </InputLabel>
                                <Select
                                    labelId="select-type"
                                    value={lesson.type}
                                    onChange={onLessonDetailsChange}
                                    labelWidth={labelWidth}
                                    inputProps={{
                                        name: "type",
                                    }}
                                >
                                    {/* <MenuItem value="TEXT">Text</MenuItem> */}
                                    <MenuItem
                                        value={String.prototype.toUpperCase.call(
                                            LESSON_TYPE_TEXT
                                        )}
                                    >
                                        {capitalize(LESSON_TYPE_TEXT)}
                                    </MenuItem>
                                    <MenuItem
                                        value={String.prototype.toUpperCase.call(
                                            LESSON_TYPE_VIDEO
                                        )}
                                    >
                                        {capitalize(LESSON_TYPE_VIDEO)}
                                    </MenuItem>
                                    <MenuItem
                                        value={String.prototype.toUpperCase.call(
                                            LESSON_TYPE_AUDIO
                                        )}
                                    >
                                        {capitalize(LESSON_TYPE_AUDIO)}
                                    </MenuItem>
                                    <MenuItem
                                        value={String.prototype.toUpperCase.call(
                                            LESSON_TYPE_PDF
                                        )}
                                    >
                                        {capitalize(LESSON_TYPE_PDF)}
                                    </MenuItem>
                                    {/* <MenuItem value={LESSON_TYPE_QUIZ}>
                {capitalize(LESSON_TYPE_QUIZ)}
              </MenuItem> */}
                                </Select>
                            </FormControl>
                            {![
                                String.prototype.toUpperCase.call(
                                    LESSON_TYPE_TEXT
                                ),
                                String.prototype.toUpperCase.call(
                                    LESSON_TYPE_QUIZ
                                ),
                            ].includes(lesson.type) && (
                                <div className={classes.formControl}>
                                    <MediaSelector
                                        title={CONTENT_URL_LABEL}
                                        src={
                                            lesson.media &&
                                            lesson.media.thumbnail
                                        }
                                        onSelection={(media: string) =>
                                            media &&
                                            setLesson(
                                                Object.assign({}, lesson, {
                                                    media,
                                                })
                                            )
                                        }
                                        mimeTypesToShow={getMimeTypesToShow()}
                                    />
                                </div>
                            )}
                            {lesson.type.toLowerCase() === LESSON_TYPE_TEXT && (
                                <Grid
                                    container
                                    className={classes.formControl}
                                    direction="column"
                                >
                                    <Grid item>
                                        <Typography variant="body1">
                                            {LESSON_CONTENT_HEADER}
                                        </Typography>
                                    </Grid>
                                    <Grid item>
                                        <TextEditor
                                            initialContentState={lesson.content}
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
                                    className={classes.formControl}
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
                                            checked={lesson.downloadable}
                                            onChange={onLessonDetailsChange}
                                        />
                                    </Grid>
                                </Grid>
                            )}
                            <Grid
                                container
                                justifyContent="space-between"
                                alignItems="center"
                                className={classes.formControl}
                            >
                                <Grid item>
                                    <Typography
                                        variant="body1"
                                        color="textSecondary"
                                    >
                                        {LESSON_REQUIRES_ENROLLMENT}
                                    </Typography>
                                </Grid>
                                <Grid item>
                                    <Switch
                                        type="checkbox"
                                        name="requiresEnrollment"
                                        checked={lesson.requiresEnrollment}
                                        onChange={onLessonDetailsChange}
                                    />
                                </Grid>
                            </Grid>
                        </form>
                    </Grid>
                    <Grid item>
                        <Grid container direction="row" spacing={2}>
                            <Grid item>
                                <Button onClick={onLessonCreate}>
                                    {BUTTON_SAVE}
                                </Button>
                            </Grid>
                            <Grid item>
                                <Button
                                    onClick={() =>
                                        setDeleteLessonPopupOpened(true)
                                    }
                                >
                                    {BUTTON_DELETE_LESSON_TEXT}
                                </Button>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            )}
            {!lesson.type && <AppLoader />}
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
            ></AppDialog>
        </StyledSection>
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
