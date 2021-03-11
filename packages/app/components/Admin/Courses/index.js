import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { addressProps, authProps, profileProps } from "../../../types.js";
import { Grid, Typography, Button } from "@material-ui/core";
import CourseEditor from "./CourseEditor.js";
import CreatorCoursesList from "./CreatorCoursesList.js";
import {
  NEW_COURSE_PAGE_HEADING,
  MANAGE_COURSES_PAGE_HEADING,
  POPUP_CANCEL_ACTION,
  POPUP_OK_ACTION,
  DISCARD_COURSE_CHANGES_POPUP_HEADER,
  EMPTY_COURSES_LIST_ADMIN,
  LOAD_MORE_TEXT,
} from "../../../config/strings.js";
import { Add, Done } from "@material-ui/icons";
import AppDialog from "../../Public/AppDialog.js";
import { makeStyles } from "@material-ui/styles";
import FetchBuilder from "../../../lib/fetch.js";
import { networkAction } from "../../../redux/actions.js";

const useStyles = makeStyles((theme) => ({
  header: {
    marginBottom: theme.spacing(1),
  },
}));

const CoursesManager = (props) => {
  const [coursesPaginationOffset, setCoursesPaginationOffset] = useState(1);
  const [creatorCourses, setCreatorCourses] = useState([]);
  const [courseEditorVisible, setCourseEditorVisible] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseEditorDirty, setCourseEditorDirty] = useState(false);
  const [userDismissingDirtyEditor, setUserDismissingDirtyEditor] = useState(
    false
  );
  const classes = useStyles();

  useEffect(() => {
    loadCreatorCourses();
  }, []);

  const loadCreatorCourses = async () => {
    const query = `
    query {
      courses: getCoursesAsAdmin(
        offset: ${coursesPaginationOffset}
      ) {
        id, title
      }
    }
    `;
    const fetch = new FetchBuilder()
      .setUrl(`${props.address.backend}/graph`)
      .setPayload(query)
      .setIsGraphQLEndpoint(true)
      .setAuthToken(props.auth.token)
      .build();
    try {
      props.dispatch(networkAction(true));
      const response = await fetch.exec();
      if (response.courses && response.courses.length > 0) {
        setCreatorCourses([...creatorCourses, ...response.courses]);
        setCoursesPaginationOffset(coursesPaginationOffset + 1);
      }
    } catch (err) {
    } finally {
      props.dispatch(networkAction(false));
    }
  };

  const showEditor = (courseId) => {
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
      <Grid
        container
        direction="row"
        justify="space-between"
        alignItems="center"
        className={classes.header}
      >
        <Grid item>
          <Typography variant="h1">
            {courseEditorVisible
              ? NEW_COURSE_PAGE_HEADING
              : MANAGE_COURSES_PAGE_HEADING}
          </Typography>
        </Grid>
        <Grid item>
          <Button
            variant="contained"
            color={courseEditorVisible ? "secondary" : "primary"}
            onClick={() => showEditor()}
          >
            {courseEditorVisible ? <Done /> : <Add />}
          </Button>
        </Grid>
      </Grid>
      <>
        {!courseEditorVisible && (
          <>
            {creatorCourses.length > 0 && (
              <>
                <CreatorCoursesList
                  courses={creatorCourses}
                  onClick={showEditor}
                />
                <Button onClick={loadCreatorCourses}>{LOAD_MORE_TEXT}</Button>
              </>
            )}
            {creatorCourses.length <= 0 && (
              <Typography variant="body1">
                {EMPTY_COURSES_LIST_ADMIN}
              </Typography>
            )}
          </>
        )}
        {courseEditorVisible && (
          <CourseEditor
            courseId={selectedCourse}
            markDirty={setCourseEditorDirty}
            closeEditor={showEditor}
          />
        )}
      </>
      <AppDialog
        onOpen={userDismissingDirtyEditor}
        onClose={markDirtyEditorClean}
        title={DISCARD_COURSE_CHANGES_POPUP_HEADER}
        actions={[
          { name: POPUP_CANCEL_ACTION, callback: markDirtyEditorClean },
          { name: POPUP_OK_ACTION, callback: dismissEditor },
        ]}
      ></AppDialog>
    </div>
  );
};

CoursesManager.propTypes = {
  auth: authProps,
  profile: profileProps,
  dispatch: PropTypes.func.isRequired,
  address: addressProps,
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  profile: state.profile,
  address: state.address,
});

const mapDispatchToProps = (dispatch) => ({
  dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(CoursesManager);
