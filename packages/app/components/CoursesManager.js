import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { authProps, profileProps } from "../types.js";
import { makeStyles } from "@material-ui/styles";
import { Grid, Typography, Fab } from "@material-ui/core";
import CourseEditor from "./CourseEditor.js";
import CreatorCoursesList from "./CreatorCoursesList.js";
import {
  NEW_COURSE_PAGE_HEADING,
  MANAGE_COURSES_PAGE_HEADING,
  POPUP_CANCEL_ACTION,
  POPUP_OK_ACTION,
  DISCARD_COURSE_CHANGES_POPUP_HEADER
} from "../config/strings.js";
import { useExecuteGraphQLQuery } from "./CustomHooks.js";
import { Add, Done } from "@material-ui/icons";
import AppDialog from "./AppDialog.js";

const useStyles = makeStyles(theme => ({
  button: {
    margin: theme.spacing(1)
  },
  fab: {
    position: "fixed",
    bottom: theme.spacing(4),
    right: theme.spacing(4)
  }
}));

// let creatorCoursesPaginationOffset = 1

const Courses = props => {
  // const [courseFormVisible, setCourseFormVisible] = useState(false)
  const [coursesPaginationOffset, setCoursesPaginationOffset] = useState(1);
  const [creatorCourses, setCreatorCourses] = useState([]);
  const classes = useStyles();
  const [courseEditorVisible, setCourseEditorVisible] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseEditorDirty, setCourseEditorDirty] = useState(false);
  const [userDismissingDirtyEditor, setUserDismissingDirtyEditor] = useState(
    false
  );
  const executeGQLCall = useExecuteGraphQLQuery();

  useEffect(() => {
    loadCreatorCourses();
  }, [props.profile.id]);

  const loadCreatorCourses = async () => {
    if (!props.profile.id) {
      return;
    }
    const query = `
    query {
      courses: getCreatorCourses(id: "${props.profile.id}", offset: ${coursesPaginationOffset}) {
        id, title
      }
    }
    `;
    try {
      const response = await executeGQLCall(query);
      if (response.courses && response.courses.length > 0) {
        setCreatorCourses([...creatorCourses, ...response.courses]);
        setCoursesPaginationOffset(coursesPaginationOffset + 1);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const showEditor = courseId => {
    if (courseEditorVisible) {
      if (courseEditorDirty) {
        setUserDismissingDirtyEditor(true);
      } else {
        setCourseEditorVisible(false);
      }
    } else {
      setSelectedCourse(courseId);
      setCourseEditorVisible(true);
    }
  };

  const markDirtyEditorClean = () => setUserDismissingDirtyEditor(false);

  const dismissEditor = () => {
    setUserDismissingDirtyEditor(false);
    setCourseEditorDirty(false);
    setCourseEditorVisible(false);
  };

  return (
    <div>
      <div>
        <Grid
          container
          direction="row"
          justify="space-between"
          alignItems="center"
        >
          <Grid item xs={12} sm={10}>
            <Typography variant="h3">
              {courseEditorVisible
                ? NEW_COURSE_PAGE_HEADING
                : MANAGE_COURSES_PAGE_HEADING}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={2}>
            <Fab
              color={courseEditorVisible ? "default" : "secondary"}
              className={classes.fab}
              onClick={() => showEditor()}
            >
              {courseEditorVisible ? <Done /> : <Add />}
            </Fab>
          </Grid>
        </Grid>
      </div>
      <div>
        {!courseEditorVisible && (
          <CreatorCoursesList
            courses={creatorCourses}
            onClick={showEditor}
            onLoadMoreClick={loadCreatorCourses}
          />
        )}
        {courseEditorVisible && (
          <CourseEditor
            courseId={selectedCourse}
            markDirty={setCourseEditorDirty}
            closeEditor={showEditor}
          />
        )}
      </div>
      <AppDialog
        onOpen={userDismissingDirtyEditor}
        onClose={markDirtyEditorClean}
        title={DISCARD_COURSE_CHANGES_POPUP_HEADER}
        actions={[
          { name: POPUP_CANCEL_ACTION, callback: markDirtyEditorClean },
          { name: POPUP_OK_ACTION, callback: dismissEditor }
        ]}
      ></AppDialog>
    </div>
  );
};

Courses.propTypes = {
  auth: authProps,
  profile: profileProps,
  dispatch: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
  auth: state.auth,
  profile: state.profile
});

const mapDispatchToProps = dispatch => ({
  dispatch: dispatch
});

export default connect(mapStateToProps, mapDispatchToProps)(Courses);
