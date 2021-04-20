import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Grid, Button, Typography } from "@material-ui/core";
import { Add, ArrowBack } from "@material-ui/icons";
import dynamic from "next/dynamic";
import {
  BUTTON_LESSON_VIEW_GO_BACK,
  BUTTON_NEW_GROUP_TEXT,
} from "../../../../config/strings";
import { Section } from "@courselit/components-library";
import { addressProps, authProps } from "../../../../types";
import { connect } from "react-redux";
import FetchBuilder from "../../../../lib/fetch";
import { networkAction, setAppMessage } from "../../../../redux/actions";
import AppMessage from "../../../../models/app-message";

const LessonEditor = dynamic(() => import("../LessonEditor"));
const Group = dynamic(() => import("./Group"));

const CourseStructureEditor = ({
  courseId,
  onCloseView,
  auth,
  address,
  dispatch,
}) => {
  const [lessons, setLessons] = useState([]);
  const [groups, setGroups] = useState([]);

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
          title
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
      .setUrl(`${address.backend}/graph`)
      .setPayload(query)
      .setIsGraphQLEndpoint(true)
      .setAuthToken(auth.token)
      .build();
    try {
      dispatch(networkAction(true));
      const response = await fetch.exec();
      if (response.course) {
        setLessons([...response.course.lessons]);
        setGroups([...response.course.groups]);
      }
    } catch (err) {
      dispatch(setAppMessage(new AppMessage(err.message)));
    } finally {
      dispatch(networkAction(false));
    }
  };

  const updateGroup = async ({ id, name, rank, collapsed }) => {
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
    console.log(mutation);
    const fetch = new FetchBuilder()
      .setUrl(`${address.backend}/graph`)
      .setPayload(mutation)
      .setIsGraphQLEndpoint(true)
      .setAuthToken(auth.token)
      .build();
    try {
      dispatch(networkAction(true));
      const response = await fetch.exec();
      if (response.course) {
        setGroups([...response.course.groups]);
      }
    } catch (err) {
      dispatch(setAppMessage(new AppMessage(err.message)));
    } finally {
      dispatch(networkAction(false));
    }
  };

  const onAddLesson = () => {
    const emptyLessonWithLocalIndexKey = Object.assign(
      {},
      {
        courseId: courseData.course.id,
        id: "",
        title: "",
      }
    );
    setLessons([...lessons, emptyLessonWithLocalIndexKey]);
  };

  const onDeleteLesson = (lessonIndex) => {
    const indexOfDeletedLesson = lessons
      .map((lesson) => lesson.lessonIndex)
      .indexOf(lessonIndex);
    setLessons([
      ...lessons.slice(0, indexOfDeletedLesson),
      ...lessons.slice(indexOfDeletedLesson + 1),
    ]);
  };

  const onLessonCreated = ({ id, title, index }) => {
    setLessons(
      lessons.map((lesson, ind) => {
        return index === ind
          ? Object.assign({}, lessons[index], { id, title })
          : lesson;
      })
    );
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

  const onRemoveGroup = async (id) => {
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
      .setUrl(`${address.backend}/graph`)
      .setPayload(mutation)
      .setIsGraphQLEndpoint(true)
      .setAuthToken(auth.token)
      .build();
    try {
      dispatch(networkAction(true));
      const response = await fetch.exec();
      if (response.course) {
        setGroups([...response.course.groups]);
      }
    } catch (err) {
      dispatch(setAppMessage(new AppMessage(err.message)));
    } finally {
      dispatch(networkAction(false));
    }
  };

  const onUpdateGroupName = () => {};
  const onUpdateGroupRank = () => {};

  return (
    <Grid item container direction="column" spacing={2}>
      <Grid item>
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <Section>
              <Grid container alignItems="center" spacing={2}>
                <Grid item>
                  <Button onClick={onCloseView} startIcon={<ArrowBack />}>
                    {BUTTON_LESSON_VIEW_GO_BACK}
                  </Button>
                </Grid>
                <Grid item>
                  <Typography variant="h6">
                    |
                  </Typography>
                </Grid>
                <Grid item>
                  <Typography variant="body1" color="textSecondary">
                    Select a lesson to begin with
                  </Typography>
                </Grid>
              </Grid>
            </Section>
          </Grid>
          <Grid item xs={12} md={4}>
            <Grid container direction="column" spacing={2}>
              <Grid item>
                {groups
                  .sort((a, b) => a.rank - b.rank)
                  .map((group) => (
                    <Group
                      group={group}
                      lessons={lessons}
                      onAddLesson={onAddLesson}
                      onRemoveGroup={onRemoveGroup}
                      updateGroup={updateGroup}
                      key={group.id}
                    />
                  ))}
              </Grid>
              <Grid item>
                <Button onClick={onAddGroup} startIcon={<Add />}>
                  {BUTTON_NEW_GROUP_TEXT}
                </Button>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* <Grid item>
        {lessons.map((item, index) => (
          <LessonEditor
            lesson={item}
            onLessonDeleted={onDeleteLesson}
            key={index}
            onLessonCreated={onLessonCreated}
            lessonIndex={index}
          />
        ))}
      </Grid> */}
      {/* <Grid item>
        <Section>
          <Grid container justify="space-between">
            <Grid item>
              <Button onClick={onCloseView} startIcon={<ArrowBack />}>
                {BUTTON_LESSON_VIEW_GO_BACK}
              </Button>
            </Grid>
            <Grid item></Grid>
          </Grid>
        </Section>
      </Grid> */}
    </Grid>
  );
};

CourseStructureEditor.propTypes = {
  courseId: PropTypes.string.isRequired,
  onCloseView: PropTypes.func.isRequired,
  auth: authProps,
  address: addressProps,
  dispatch: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  address: state.address,
});

const mapDispatchToProps = (dispatch) => ({
  dispatch,
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(CourseStructureEditor);
