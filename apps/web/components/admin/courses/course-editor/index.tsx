import React, { useState, useEffect } from "react";
import { styled } from "@mui/system";
import { connect } from "react-redux";
import {
    BTN_DELETE_COURSE,
    ERR_COURSE_COST_REQUIRED,
    ERR_COURSE_TITLE_REQUIRED,
    BUTTON_SAVE,
    FORM_FIELD_FEATURED_IMAGE,
    BUTTON_MANAGE_LESSONS_TEXT,
    DANGER_ZONE_HEADER,
    DANGER_ZONE_DESCRIPTION,
    DELETE_COURSE_POPUP_HEADER,
    POPUP_CANCEL_ACTION,
    POPUP_OK_ACTION,
    BLOG_POST_SWITCH,
    APP_MESSAGE_COURSE_SAVED,
    VISIT_POST_BUTTON,
    VISIT_COURSE_BUTTON,
    BTN_PUBLISH,
    BTN_UNPUBLISH,
    APP_MESSAGE_COURSE_DELETED,
    COURSE_SETTINGS_CARD_HEADER,
    NEW_COURSE_PAGE_HEADING,
    EDIT_COURSE_PAGE_HEADING,
} from "../../../../ui-config/strings";
import { actionCreators } from "@courselit/state-management";
import { formulateCourseUrl, checkPermission } from "../../../../ui-lib/utils";
import Link from "next/link";
import {
    Grid,
    TextField,
    Typography,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Switch,
    Button,
    IconButton,
} from "@mui/material";
import { ArrowBack, Delete } from "@mui/icons-material";
import { AppMessage } from "@courselit/common-models";
import { MIMETYPE_IMAGE, permissions } from "../../../../ui-config/constants";
import { FetchBuilder } from "@courselit/utils";
import { Section, RichText as TextEditor } from "@courselit/components-library";
import dynamic from "next/dynamic";
import type { AppDispatch, AppState } from "@courselit/state-management";
import type { Profile, Auth, Address } from "@courselit/common-models";
import { EditorState } from "draft-js";
import Media from "@courselit/common-models/dist/media";

const { networkAction, setAppMessage } = actionCreators;

const PREFIX = "index";

const classes = {
    formControl: `${PREFIX}-formControl`,
};

const StyledGrid = styled(Grid)({
    [`& .${classes.formControl}`]: {
        minWidth: "100%",
    },
});

const AppDialog = dynamic(() => import("../../../public/app-dialog"));
const MediaSelector = dynamic(() => import("../../media/media-selector"));
const CourseStructureEditor = dynamic(
    () => import("./course-structure-editor")
);

interface CourseEditorProps {
    auth: Auth;
    profile: Profile;
    courseId: string;
    dispatch: AppDispatch;
    closeEditor: (...args: any[]) => void;
    address: Address;
}

const CourseEditor = (props: CourseEditorProps) => {
    const initCourseMetaData = {
        title: "",
        cost: undefined,
        published: false,
        privacy: "UNLISTED",
        isBlog: false,
        description: TextEditor.emptyState(),
        featuredImage: null,
        id: null,
        isFeatured: false,
        slug: "",
        courseId: -1,
        tags: [],
    };
    const initCourseData = {
        course: initCourseMetaData,
    };
    const [courseData, setCourseData] = useState(initCourseData);
    const [userError, setUserError] = useState("");
    const [deleteCoursePopupOpened, setDeleteCoursePopupOpened] =
        useState(false);
    const [courseStructureEditorActive, setCourseStructureEditorActive] =
        useState(false);

    useEffect(() => {
        if (props.courseId) {
            loadCourse(props.courseId);
        }
    }, [props.courseId]);

    // For privacy dropdown
    const inputLabel: React.RefObject<HTMLInputElement> = React.useRef(null);
    const [labelWidth, setLabelWidth] = React.useState(0);
    useEffect(() => {
        setLabelWidth(inputLabel.current!.offsetWidth);
    }, []);

    // To clear the error, call setError().
    const setError = (msg = "") => setUserError(msg);

    const onCourseCreate = async (e: any) => {
        e.preventDefault();
        setError();

        // validate the data
        if (!courseData.course.title) {
            return props.dispatch(
                setAppMessage(new AppMessage(ERR_COURSE_TITLE_REQUIRED))
            );
        }
        if (
            !courseData.course.isBlog &&
            isNaN(courseData.course.cost === "undefined")
        ) {
            return props.dispatch(
                setAppMessage(new AppMessage(ERR_COURSE_COST_REQUIRED))
            );
        }

        let query = "";
        if (courseData.course.id) {
            query = `
      mutation {
        course: updateCourse(courseData: {
          id: "${courseData.course.id}"
          title: "${courseData.course.title}",
          cost: ${courseData.course.isBlog ? 0 : courseData.course.cost},
          privacy: ${courseData.course.privacy.toUpperCase()},
          isBlog: ${courseData.course.isBlog},
          description: "${TextEditor.stringify(courseData.course.description)}",
          featuredImage: ${
              courseData.course.featuredImage
                  ? '"' + courseData.course.featuredImage.mediaId + '"'
                  : null
          },
          isFeatured: ${courseData.course.isFeatured},
          tags: [${courseData.course.tags.map((tag) => '"' + tag + '"')}]
        }) {
          id,
          title,
          cost,
          published,
          privacy,
          isBlog,
          description,
          featuredImage {
            mediaId,
            thumbnail
          },
          isFeatured,
          tags,
          slug,
          courseId,
          groups {
            id,
            name,
            rank
          }
        }
      }
      `;
        } else {
            query = `
      mutation {
        course: createCourse(courseData: {
          title: "${courseData.course.title}",
          cost: ${courseData.course.isBlog ? 0 : courseData.course.cost}
          privacy: ${courseData.course.privacy.toUpperCase()},
          isBlog: ${courseData.course.isBlog},
          description: "${TextEditor.stringify(courseData.course.description)}",
          featuredImage: ${
              courseData.course.featuredImage
                  ? '"' + courseData.course.featuredImage.mediaId + '"'
                  : null
          },
          isFeatured: ${courseData.course.isFeatured},
          tags: [${courseData.course.tags.map((tag) => '"' + tag + '"')}]
        }) {
          id,
          title,
          cost,
          published,
          privacy,
          isBlog,
          description,
          featuredImage {
            mediaId,
            thumbnail
          },
          isFeatured,
          tags,
          slug,
          courseId,
          groups {
            id,
            name,
            rank
          }
        }
      }
      `;
        }
        const fetch = new FetchBuilder()
            .setUrl(`${props.address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            const response = await fetch.exec();
            if (response.course) {
                setCourseDataWithDescription(response.course);
                props.dispatch(
                    setAppMessage(new AppMessage(APP_MESSAGE_COURSE_SAVED))
                );
            }
        } catch (err) {
            props.dispatch(setAppMessage(new AppMessage(err.message)));
            props.courseId && loadCourse(props.courseId);
        }
    };

    const togglePublishedStatus = async (e) => {
        const query = `
      mutation {
        course: updateCourse(courseData: {
          id: "${courseData.course.id}"
          published: ${!courseData.course.published}
        }) {
          id,
          title,
          cost,
          published,
          privacy,
          isBlog,
          description,
          featuredImage {
            mediaId,
            thumbnail
          },
          isFeatured,
          tags,
          slug,
          courseId,
          groups {
            id,
            name,
            rank
          }
        }
      }
    `;
        const fetch = new FetchBuilder()
            .setUrl(`${props.address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            props.dispatch(networkAction(true));
            const response = await fetch.exec();
            if (response.course) {
                setCourseDataWithDescription(response.course);
                props.dispatch(
                    setAppMessage(new AppMessage(APP_MESSAGE_COURSE_SAVED))
                );
            }
        } catch (err: any) {
            props.dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            props.dispatch(networkAction(false));
        }
    };

    const onCourseDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        changeCourseDetails(
            e.target.name,
            e.target.type === "checkbox" ? e.target.checked : e.target.value
        );
    };

    const onCourseTagsChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
        const tags = e.target.value.split(/,\s*/);
        setCourseData(
            Object.assign({}, courseData, {
                course: Object.assign({}, courseData.course, { tags }),
            })
        );
    };

    const changeCourseDetails = (key: string, value: any) => {
        setCourseData(
            Object.assign({}, courseData, {
                course: Object.assign({}, courseData.course, {
                    [key]: value,
                }),
            })
        );
    };

    const onDescriptionChange = (editorState: EditorState) => {
        setCourseData(
            Object.assign({}, courseData, {
                course: Object.assign({}, courseData.course, {
                    description: editorState,
                }),
            })
        );
    };

    const onCourseDelete = async () => {
        const query = `
    mutation {
      result: deleteCourse(id: "${courseData.course.id}")
    }
    `;

        const fetch = new FetchBuilder()
            .setUrl(`${props.address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            props.dispatch(networkAction(true));
            const response = await fetch.exec();

            if (response.result) {
                setCourseData(
                    Object.assign({}, courseData, {
                        course: initCourseMetaData,
                    })
                );
                closeDeleteCoursePopup();
                props.closeEditor();
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            props.dispatch(networkAction(false));
            props.dispatch(
                setAppMessage(new AppMessage(APP_MESSAGE_COURSE_DELETED))
            );
        }
    };

    const setCourseDataWithDescription = (course) => {
        setCourseData(
            Object.assign({}, courseData, {
                course: Object.assign({}, course, {
                    description: TextEditor.hydrate({
                        data: course.description,
                    }),
                }),
            })
        );
    };

    const loadCourse = async (courseId: string) => {
        const query = `
    query {
      course: getCourse(courseId: "${courseId}") {
        title,
        cost,
        published,
        privacy,
        isBlog,
        description,
        featuredImage {
          mediaId,
          thumbnail
        },
        id,
        lessons {
          id,
          title
        },
        isFeatured,
        tags,
        slug,
        courseId,
        groups {
          id,
          name,
          rank
        }
      }
    }
    `;
        const fetch = new FetchBuilder()
            .setUrl(`${props.address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            props.dispatch(networkAction(true));
            const response = await fetch.exec();
            if (response.course) {
                setCourseDataWithDescription(response.course);
            }
        } catch (err) {
            props.dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            props.dispatch(networkAction(false));
        }
    };

    const onFeaturedImageSelection = (media?: Media) => {
        return media && changeCourseDetails("featuredImage", media || null);
    };

    const closeDeleteCoursePopup = () => setDeleteCoursePopupOpened(false);

    return (
        <StyledGrid container direction="column" spacing={2}>
            <Grid item xs={12}>
                <Section>
                    <Grid item xs>
                        <Grid container alignItems="center">
                            <Grid item>
                                <IconButton size="large">
                                    <Link href="/dashboard/courses">
                                        <ArrowBack />
                                    </Link>
                                </IconButton>
                            </Grid>
                            <Grid item>
                                <Typography variant="h1">
                                    {props.courseId
                                        ? EDIT_COURSE_PAGE_HEADING
                                        : NEW_COURSE_PAGE_HEADING}
                                </Typography>
                            </Grid>
                        </Grid>
                    </Grid>
                </Section>
            </Grid>
            <Grid item>
                <Grid container direction="column">
                    {!courseStructureEditorActive && (
                        <Grid item xs={12}>
                            <form onSubmit={onCourseCreate}>
                                <Grid container spacing={2}>
                                    <Grid item sm={12} md={8}>
                                        <Section>
                                            {userError && (
                                                <div>{userError}</div>
                                            )}
                                            <TextField
                                                required
                                                variant="outlined"
                                                label="Title"
                                                fullWidth
                                                margin="normal"
                                                name="title"
                                                value={courseData.course.title}
                                                onChange={onCourseDetailsChange}
                                            />
                                            <TextEditor
                                                initialContentState={
                                                    courseData.course
                                                        .description
                                                }
                                                onChange={onDescriptionChange}
                                            />
                                        </Section>
                                    </Grid>

                                    <Grid item sm={12} md={4}>
                                        <Grid container spacing={2}>
                                            <Grid item xs={12}>
                                                <Section>
                                                    <Grid
                                                        container
                                                        direction="row"
                                                        justifyContent="space-between"
                                                    >
                                                        <Grid item>
                                                            <Button
                                                                type="submit"
                                                                variant="outlined"
                                                                color="primary"
                                                            >
                                                                {BUTTON_SAVE}
                                                            </Button>
                                                        </Grid>
                                                        {!courseData.course
                                                            .isBlog &&
                                                            courseData.course
                                                                .id && (
                                                                <Grid item>
                                                                    <Button
                                                                        variant="outlined"
                                                                        onClick={() =>
                                                                            setCourseStructureEditorActive(
                                                                                true
                                                                            )
                                                                        }
                                                                    >
                                                                        {
                                                                            BUTTON_MANAGE_LESSONS_TEXT
                                                                        }
                                                                    </Button>
                                                                </Grid>
                                                            )}
                                                        {courseData.course
                                                            .id && (
                                                            <>
                                                                {checkPermission(
                                                                    props
                                                                        .profile
                                                                        .permissions,
                                                                    [
                                                                        permissions.publishCourse,
                                                                    ]
                                                                ) && (
                                                                    <Grid item>
                                                                        <Button
                                                                            onClick={
                                                                                togglePublishedStatus
                                                                            }
                                                                            variant="outlined"
                                                                        >
                                                                            {courseData
                                                                                .course
                                                                                .published
                                                                                ? BTN_UNPUBLISH
                                                                                : BTN_PUBLISH}
                                                                        </Button>
                                                                    </Grid>
                                                                )}
                                                                {courseData
                                                                    .course
                                                                    .published && (
                                                                    <Grid item>
                                                                        <Button>
                                                                            <Link
                                                                                href={formulateCourseUrl(
                                                                                    courseData.course
                                                                                )}
                                                                            >
                                                                                <a target="_blank">
                                                                                    {courseData
                                                                                        .course
                                                                                        .isBlog
                                                                                        ? VISIT_POST_BUTTON
                                                                                        : VISIT_COURSE_BUTTON}
                                                                                </a>
                                                                            </Link>
                                                                        </Button>
                                                                    </Grid>
                                                                )}
                                                            </>
                                                        )}
                                                    </Grid>
                                                </Section>
                                            </Grid>

                                            <Grid item xs={12}>
                                                <Section>
                                                    <Grid
                                                        container
                                                        spacing={2}
                                                        direction="column"
                                                    >
                                                        <Grid item>
                                                            <Typography variant="h4">
                                                                {
                                                                    COURSE_SETTINGS_CARD_HEADER
                                                                }
                                                            </Typography>
                                                        </Grid>
                                                        <Grid item>
                                                            <Grid
                                                                container
                                                                justifyContent="space-between"
                                                                alignItems="center"
                                                            >
                                                                <Grid item>
                                                                    <Typography variant="body1">
                                                                        {
                                                                            BLOG_POST_SWITCH
                                                                        }
                                                                    </Typography>
                                                                </Grid>
                                                                <Grid item>
                                                                    <Switch
                                                                        type="checkbox"
                                                                        name="isBlog"
                                                                        checked={
                                                                            courseData
                                                                                .course
                                                                                .isBlog
                                                                        }
                                                                        onChange={
                                                                            onCourseDetailsChange
                                                                        }
                                                                    />
                                                                </Grid>
                                                            </Grid>
                                                        </Grid>
                                                        {!courseData.course
                                                            .isBlog && (
                                                            <Grid item>
                                                                <TextField
                                                                    required
                                                                    type="number"
                                                                    variant="outlined"
                                                                    label="Cost"
                                                                    fullWidth
                                                                    margin="normal"
                                                                    name="cost"
                                                                    step="0.1"
                                                                    value={
                                                                        courseData
                                                                            .course
                                                                            .cost
                                                                    }
                                                                    onChange={
                                                                        onCourseDetailsChange
                                                                    }
                                                                />
                                                            </Grid>
                                                        )}
                                                        <Grid item>
                                                            <FormControl
                                                                variant="outlined"
                                                                className={
                                                                    classes.formControl
                                                                }
                                                            >
                                                                <InputLabel
                                                                    ref={
                                                                        inputLabel
                                                                    }
                                                                    htmlFor="outlined-privacy-simple"
                                                                >
                                                                    Privacy
                                                                </InputLabel>
                                                                <Select
                                                                    value={
                                                                        courseData
                                                                            .course
                                                                            .privacy
                                                                    }
                                                                    onChange={
                                                                        onCourseDetailsChange
                                                                    }
                                                                    labelwidth={
                                                                        labelWidth
                                                                    }
                                                                    inputProps={{
                                                                        name: "privacy",
                                                                        id: "outlined-privacy-simple",
                                                                    }}
                                                                >
                                                                    <MenuItem value="PUBLIC">
                                                                        Public
                                                                    </MenuItem>
                                                                    <MenuItem value="UNLISTED">
                                                                        Unlisted
                                                                    </MenuItem>
                                                                </Select>
                                                            </FormControl>
                                                        </Grid>
                                                        <Grid item>
                                                            <MediaSelector
                                                                title={
                                                                    FORM_FIELD_FEATURED_IMAGE
                                                                }
                                                                src={
                                                                    courseData
                                                                        .course
                                                                        .featuredImage &&
                                                                    courseData
                                                                        .course
                                                                        .featuredImage
                                                                        .thumbnail
                                                                }
                                                                onSelection={
                                                                    onFeaturedImageSelection
                                                                }
                                                                mimeTypesToShow={[
                                                                    ...MIMETYPE_IMAGE,
                                                                ]}
                                                                access="public"
                                                            />
                                                        </Grid>
                                                        {!courseData.course
                                                            .isBlog && (
                                                            <Grid item>
                                                                <Grid
                                                                    container
                                                                    justifyContent="space-between"
                                                                    alignItems="center"
                                                                >
                                                                    <Grid item>
                                                                        <Typography variant="body1">
                                                                            Featured
                                                                            course
                                                                        </Typography>
                                                                    </Grid>
                                                                    <Grid item>
                                                                        <Switch
                                                                            type="checkbox"
                                                                            name="isFeatured"
                                                                            checked={
                                                                                courseData
                                                                                    .course
                                                                                    .isFeatured
                                                                            }
                                                                            onChange={
                                                                                onCourseDetailsChange
                                                                            }
                                                                        />
                                                                    </Grid>
                                                                </Grid>
                                                            </Grid>
                                                        )}
                                                        <Grid item>
                                                            <TextField
                                                                type="text"
                                                                variant="outlined"
                                                                label="Tags"
                                                                fullWidth
                                                                margin="normal"
                                                                name="tags"
                                                                value={
                                                                    courseData
                                                                        .course
                                                                        .tags &&
                                                                    courseData.course.tags.join(
                                                                        ","
                                                                    )
                                                                }
                                                                onChange={
                                                                    onCourseTagsChanged
                                                                }
                                                            />
                                                        </Grid>
                                                    </Grid>
                                                </Section>
                                            </Grid>

                                            <Grid item xs={12}>
                                                <Section>
                                                    <Grid
                                                        container
                                                        direction="column"
                                                        spacing={2}
                                                    >
                                                        <Grid item>
                                                            <Typography variant="h4">
                                                                {
                                                                    DANGER_ZONE_HEADER
                                                                }
                                                            </Typography>
                                                        </Grid>
                                                        <Grid item>
                                                            <Typography variant="body1">
                                                                {
                                                                    DANGER_ZONE_DESCRIPTION
                                                                }
                                                            </Typography>
                                                        </Grid>
                                                        <Grid item>
                                                            <Button
                                                                variant="outlined"
                                                                color="secondary"
                                                                onClick={() =>
                                                                    setDeleteCoursePopupOpened(
                                                                        true
                                                                    )
                                                                }
                                                                startIcon={
                                                                    <Delete />
                                                                }
                                                            >
                                                                {
                                                                    BTN_DELETE_COURSE
                                                                }
                                                            </Button>
                                                        </Grid>
                                                    </Grid>
                                                </Section>
                                            </Grid>
                                        </Grid>
                                    </Grid>
                                </Grid>
                            </form>
                        </Grid>
                    )}
                    {courseStructureEditorActive && (
                        <CourseStructureEditor
                            courseId={courseData.course.id}
                            onCloseView={() =>
                                setCourseStructureEditorActive(false)
                            }
                        />
                    )}
                    <AppDialog
                        onOpen={deleteCoursePopupOpened}
                        onClose={closeDeleteCoursePopup}
                        title={DELETE_COURSE_POPUP_HEADER}
                        actions={[
                            {
                                name: POPUP_CANCEL_ACTION,
                                callback: closeDeleteCoursePopup,
                            },
                            { name: POPUP_OK_ACTION, callback: onCourseDelete },
                        ]}
                    />
                </Grid>
            </Grid>
        </StyledGrid>
    );
};

const mapStateToProps = (state: AppState) => ({
    auth: state.auth,
    profile: state.profile,
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(CourseEditor);
