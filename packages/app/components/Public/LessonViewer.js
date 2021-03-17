import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import FetchBuilder from "../../lib/fetch";
import { LESSON_TYPE_VIDEO, LESSON_TYPE_AUDIO } from "../../config/constants";
import { connect } from "react-redux";
import { networkAction } from "../../redux/actions";
import { Typography, Grid } from "@material-ui/core";
import { ENROLL_IN_THE_COURSE, USER_ERROR_HEADER } from "../../config/strings";
import { makeStyles } from "@material-ui/styles";
import { lesson, authProps, profileProps, addressProps } from "../../types";
import { formulateMediaUrl } from "../../lib/utils.js";
import { RichText as TextEditor } from "@courselit/components-library";

const useStyles = makeStyles((theme) => ({
  notEnrolledHeader: {
    marginBottom: theme.spacing(1),
  },
  videoPlayer: {
    width: "100%",
    height: "auto",
  },
  section: {
    marginTop: "1.6em",
  },
}));

const LessonViewer = (props) => {
  const [lesson, setLesson] = useState(props.lesson);
  const [isEnrolled] = useState(
    !lesson.requiresEnrollment ||
      (props.profile && props.profile.purchases.includes(props.lesson.courseId))
  );
  const classes = useStyles();

  useEffect(() => {
    props.lesson.id && isEnrolled && loadLesson(props.lesson.id);
  }, [props.lesson]);

  const loadLesson = async (id) => {
    const query = `
    query {
      lesson: getLessonDetails(id: "${id}") {
        id,
        title,
        downloadable,
        type,
        content,
        contentURL,
        requiresEnrollment,
        courseId
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

      if (response.lesson) {
        setLesson(
          Object.assign({}, response.lesson, {
            content: TextEditor.hydrate({ data: response.lesson.content }),
          })
        );
      }
    } catch (err) {
    } finally {
      props.dispatch(networkAction(false));
    }
  };

  return (
    <>
      {!isEnrolled && (
        <>
          <Typography variant="h1" className={classes.notEnrolledHeader}>
            {USER_ERROR_HEADER}
          </Typography>
          <Typography variant="body1">{ENROLL_IN_THE_COURSE}</Typography>
        </>
      )}
      {isEnrolled && (
        <Grid container direction="column" component="article">
          <Grid item>
            <header>
              <Typography variant="h1">{lesson.title}</Typography>
            </header>
          </Grid>
          {String.prototype.toUpperCase.call(LESSON_TYPE_VIDEO) ===
            lesson.type && (
            <Grid item>
              <video
                controls
                controlsList="nodownload"
                className={`${classes.videoPlayer} ${classes.section}`}
              >
                <source
                  src={`${formulateMediaUrl(
                    props.address.backend,
                    lesson.contentURL,
                    false
                  )}`}
                  type="video/mp4"
                />
                Your browser does not support the video tag.
              </video>
            </Grid>
          )}
          {String.prototype.toUpperCase.call(LESSON_TYPE_AUDIO) ===
            lesson.type && (
            <Grid item>
              <audio
                controls
                controlsList="nodownload"
                className={classes.section}
              >
                <source
                  src={`${formulateMediaUrl(
                    props.address.backend,
                    lesson.contentURL,
                    false
                  )}`}
                  type="audio/mpeg"
                />
                Your browser does not support the video tag.
              </audio>
            </Grid>
          )}
          {lesson.content && (
            <Grid item className={classes.section}>
              <TextEditor
                initialContentState={lesson.content}
                readOnly={true}
              />
            </Grid>
          )}
        </Grid>
      )}
    </>
  );
};

LessonViewer.propTypes = {
  lesson: lesson,
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

export default connect(mapStateToProps, mapDispatchToProps)(LessonViewer);
