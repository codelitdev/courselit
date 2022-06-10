import React, { useEffect, useState } from "react";
import { styled } from "@mui/material/styles";
import { Grid, Button, Typography } from "@mui/material";
import { Add } from "@mui/icons-material";
import dynamic from "next/dynamic";
import {
    BUTTON_LESSON_VIEW_GO_BACK,
    BUTTON_NEW_GROUP_TEXT,
    COURSE_STRUCTURE_SELECT_LESSON,
    SECTION_GROUP_HEADER,
} from "../../../../ui-config/strings";
import { Section, RichText as TextEditor } from "@courselit/components-library";
import { connect } from "react-redux";
import { FetchBuilder } from "@courselit/utils";
import { LESSON_TYPE_TEXT } from "../../../../ui-config/constants";
import type { Auth, Address, Lesson } from "@courselit/common-models";
import { AppMessage } from "@courselit/common-models";
import type { AppDispatch, AppState } from "@courselit/state-management";
import { actionCreators } from "@courselit/state-management";

const PREFIX = "CourseStructureEditor";

const classes = {
    groupsContainer: `${PREFIX}-groupsContainer`,
    placeholder: `${PREFIX}-placeholder`,
};

const StyledGrid = styled(Grid)(({ theme }: { theme: any }) => ({
    [`& .${classes.groupsContainer}`]: {
        maxHeight: 720,
        overflowY: "scroll",
    },

    [`& .${classes.placeholder}`]: {
        padding: theme.spacing(4),
        border: "2px dashed #eee",
        textAlign: "center",
    },
}));

const LessonEditor = dynamic(() => import("../lesson-editor"));
const Group = dynamic(() => import("./group"));

interface CourseStructureEditorProps {
    courseId: string;
    onCloseView: (...args: any[]) => void;
    auth: Auth;
    address: Address;
    dispatch: AppDispatch;
}

const CourseStructureEditor = ({
    courseId,
    onCloseView,
    auth,
    address,
    dispatch,
}: CourseStructureEditorProps) => {
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [groups, setGroups] = useState<any>([]);
    const [selectedLesson, setSelectedLesson] = useState<Lesson>({} as Lesson);

    useEffect(() => {
        if (courseId) {
            loadLessonsAndGroups();
        }
    }, [courseId]);

    const loadLessonsAndGroups = async () => {
        const query = `
    query {
      course: getCourse(id: "${courseId}") {
        lessons {
          id,
          title,
          groupId,
          groupRank
        },
        groups {
          id,
          name,
          rank,
          collapsed
        }
      }
    }
    `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            dispatch(actionCreators.networkAction(true));
            const response = await fetch.exec();
            if (response.course) {
                setLessons([...response.course.lessons]);
                setGroups([...response.course.groups]);
            }
        } catch (err: any) {
            dispatch(actionCreators.setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(actionCreators.networkAction(false));
        }
    };

    const updateGroup = async ({
        id,
        name,
        rank,
        collapsed,
    }: {
        id: string;
        name: string;
        rank: number;
        collapsed: boolean;
    }) => {
        const mutation = id
            ? `
    mutation {
      course: updateGroup(
        id: "${id}",
        courseId: "${courseId}",
        name: "${name}",
        collapsed: ${collapsed}
      ) {
        groups {
          id,
          name,
          rank,
          collapsed
        }
      }
    }
    `
            : `
    mutation {
      course: addGroup(id: "${courseId}", name: "${name}", collapsed: ${collapsed}) {
        groups {
          id,
          name,
          rank,
          collapsed
        }
      }
    }
    `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(mutation)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            dispatch(actionCreators.networkAction(true));
            const response = await fetch.exec();
            if (response.course) {
                setGroups([...response.course.groups]);
            }
        } catch (err: any) {
            dispatch(actionCreators.setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(actionCreators.networkAction(false));
        }
    };

    const onAddLesson = (groupId: string) => {
        const emptyLessonWithLocalIndexKey: Lesson = Object.assign(
            {},
            {
                id: "",
                title: "",
                type: String.prototype.toUpperCase.call(LESSON_TYPE_TEXT),
                content: TextEditor.emptyState(),
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
                groupId,
            }
        );
        setLessons([...lessons, emptyLessonWithLocalIndexKey]);
    };

    const onLessonUpdated = async (lessonDeleted = false) => {
        if (lessonDeleted) {
            setSelectedLesson({} as Lesson);
        }

        await loadLessonsAndGroups();
    };

    const onAddGroup = () => {
        setGroups([
            ...groups,
            {
                id: "",
                name: "",
                rank: Infinity,
                collapsed: true,
            },
        ]);
    };

    const onRemoveGroup = async (id: number) => {
        const mutation = `
      mutation {
        course: removeGroup(id: "${id}", courseId: "${courseId}") {
          id,
          groups {
            id,
            name,
            rank,
            collapsed
          }
        }
      }
    `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(mutation)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            dispatch(actionCreators.networkAction(true));
            const response = await fetch.exec();
            if (response.course) {
                setGroups([...response.course.groups]);
            }
        } catch (err: any) {
            dispatch(actionCreators.setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(actionCreators.networkAction(false));
        }
    };

    const onSelectLesson = (groupId: number, index: number) => {
        const lesson = lessons.filter(
            (lesson) => parseInt(lesson.groupId) === groupId
        )[index];
        setSelectedLesson(Object.assign({}, lesson, { index }));
    };

    return (
        <StyledGrid item container direction="column" spacing={2}>
            <Grid item>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={8}>
                        <Grid container direction="column" spacing={2}>
                            {selectedLesson.groupId && (
                                <Grid item>
                                    <LessonEditor
                                        lesson={selectedLesson}
                                        onLessonUpdated={onLessonUpdated}
                                    />
                                </Grid>
                            )}
                            {!selectedLesson.groupId && (
                                <Grid item>
                                    <Section>
                                        <Typography
                                            variant="h5"
                                            color="textSecondary"
                                        >
                                            {COURSE_STRUCTURE_SELECT_LESSON}
                                        </Typography>
                                    </Section>
                                </Grid>
                            )}
                            <Grid item>
                                <Section>
                                    <Grid
                                        container
                                        direction="column"
                                        spacing={2}
                                    >
                                        <Grid item>
                                            <Button
                                                onClick={onCloseView}
                                                variant="outlined"
                                            >
                                                {BUTTON_LESSON_VIEW_GO_BACK}
                                            </Button>
                                        </Grid>
                                    </Grid>
                                </Section>
                            </Grid>
                        </Grid>
                    </Grid>
                    <Grid
                        item
                        xs={12}
                        md={4}
                        className={classes.groupsContainer}
                    >
                        <Section>
                            <Grid container direction="column" spacing={2}>
                                <Grid item>
                                    <Typography variant="h4">
                                        {SECTION_GROUP_HEADER}
                                    </Typography>
                                </Grid>
                                <Grid item>
                                    {groups
                                        .sort(
                                            (a: any, b: any) => a.rank - b.rank
                                        )
                                        .map((group: any, index: number) => (
                                            <Group
                                                key={index}
                                                group={group}
                                                lessons={lessons}
                                                onAddLesson={onAddLesson}
                                                onRemoveGroup={onRemoveGroup}
                                                updateGroup={updateGroup}
                                                onSelectLesson={onSelectLesson}
                                                selectedLesson={Object.assign(
                                                    selectedLesson,
                                                    {
                                                        index,
                                                    }
                                                )}
                                            />
                                        ))}
                                </Grid>
                                <Grid item>
                                    <Button
                                        onClick={onAddGroup}
                                        startIcon={<Add />}
                                        fullWidth
                                        variant="outlined"
                                        color="primary"
                                    >
                                        {BUTTON_NEW_GROUP_TEXT}
                                    </Button>
                                </Grid>
                            </Grid>
                        </Section>
                    </Grid>
                </Grid>
            </Grid>
        </StyledGrid>
    );
};

const mapStateToProps = (state: AppState) => ({
    auth: state.auth,
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch,
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(CourseStructureEditor);
