import React, { useState, useEffect /* useRef */ } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { authProps, profileProps, addressProps } from "../../../types.js";
import {
  BTN_DELETE_COURSE,
  ERR_COURSE_COST_REQUIRED,
  ERR_COURSE_TITLE_REQUIRED,
  BUTTON_SAVE,
  FORM_FIELD_FEATURED_IMAGE,
  BUTTON_NEW_LESSON_TEXT,
  COURSE_DETAILS_CARD_HEADER,
  DANGER_ZONE_HEADER,
  DANGER_ZONE_DESCRIPTION,
  DELETE_COURSE_POPUP_HEADER,
  POPUP_CANCEL_ACTION,
  POPUP_OK_ACTION,
  BLOG_POST_SWITCH,
  APP_MESSAGE_COURSE_SAVED,
  COURSE_EDITOR_DESCRIPTION,
  VISIT_POST_BUTTON,
  VISIT_COURSE_BUTTON,
} from "../../../config/strings.js";
import { networkAction, setAppMessage } from "../../../redux/actions.js";
import { queryGraphQL, formulateCourseUrl } from "../../../lib/utils.js";
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
} from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import MediaSelector from "../Media/MediaSelector.js";
import { Delete, Add } from "@material-ui/icons";
import AppDialog from "../../Public/AppDialog.js";
import LessonEditor from "./LessonEditor.js";
import AppMessage from "../../../models/app-message.js";
import { MIMETYPE_IMAGE } from "../../../config/constants.js";
import FetchBuilder from "../../../lib/fetch";
import { Card, RichText as TextEditor } from "@courselit/components-library";

const useStyles = makeStyles((theme) => ({
  title: {
    marginTop: theme.spacing(3),
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: "100%",
  },
  editor: {
    border: "1px solid #cacaca",
    borderRadius: "6px",
    padding: "10px 8px",
    maxHeight: 300,
    overflow: "auto",
    marginBottom: theme.spacing(2),
  },
  editorLabel: {
    fontSize: "1em",
    marginBottom: theme.spacing(1),
  },
  controlRow: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  link: {
    textDecoration: "none",
    color: "inherit",
  },
  cardHeader: {
    marginBottom: theme.spacing(1),
  },
  lessonItem: {
    marginBottom: theme.spacing(2),
  },
  addLesson: {
    marginBottom: theme.spacing(2),
  },
  section: {
    background: "white",
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2),
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
  },
  deleteButton: {
    background: "red",
    color: "white",
    marginTop: theme.spacing(2),
  },
}));

const CourseEditor = (props) => {
  const initCourseMetaData = {
    title: "",
    cost: "",
    published: false,
    privacy: "PRIVATE",
    isBlog: false,
    description: TextEditor.emptyState(),
    featuredImage: "",
    id: null,
    isFeatured: false,
    slug: "",
    courseId: -1,
  };
  const initCourseData = {
    course: initCourseMetaData,
  };
  const [courseData, setCourseData] = useState(initCourseData);
  const [userError, setUserError] = useState("");
  const [deleteCoursePopupOpened, setDeleteCoursePopupOpened] = useState(false);
  const [lessons, setLessons] = useState([]);
  const classes = useStyles();
  const [lessonIndex, setLessonIndex] = useState(0);

  useEffect(() => {
    if (props.courseId) {
      loadCourse(props.courseId);
    }
  }, [props.courseId]);

  // For privacy dropdown
  const inputLabel = React.useRef(null);
  const [labelWidth, setLabelWidth] = React.useState(0);
  useEffect(() => {
    setLabelWidth(inputLabel.current.offsetWidth);
  }, []);

  // To clear the error, call setError().
  const setError = (msg = "") => setUserError(msg);

  const onCourseCreate = async (e) => {
    e.preventDefault();
    setError();

    // validate the data
    if (!courseData.course.title) {
      return setUserError(ERR_COURSE_TITLE_REQUIRED);
    }
    if (!courseData.course.isBlog && !courseData.course.cost) {
      return setUserError(ERR_COURSE_COST_REQUIRED);
    }

    let query = "";
    if (courseData.course.id) {
      // update the existing record
      query = `
      mutation {
        course: updateCourse(courseData: {
          id: "${courseData.course.id}"
          title: "${courseData.course.title}",
          cost: ${courseData.course.isBlog ? 0 : courseData.course.cost},
          published: ${courseData.course.published},
          privacy: ${courseData.course.privacy.toUpperCase()},
          isBlog: ${courseData.course.isBlog},
          description: "${TextEditor.stringify(courseData.course.description)}",
          featuredImage: "${courseData.course.featuredImage}",
          isFeatured: ${courseData.course.isFeatured}
        }) {
          id,
          title,
          cost,
          published,
          privacy,
          isBlog,
          description,
          featuredImage,
          isFeatured,
          slug,
          courseId
        }
      }
      `;
    } else {
      // make a new record
      query = `
      mutation {
        course: createCourse(courseData: {
          title: "${courseData.course.title}",
          cost: ${courseData.course.isBlog ? 0 : courseData.course.cost},
          published: ${courseData.course.published},
          privacy: ${courseData.course.privacy.toUpperCase()},
          isBlog: ${courseData.course.isBlog},
          description: "${TextEditor.stringify(courseData.course.description)}",
          featuredImage: "${courseData.course.featuredImage}",
          isFeatured: ${courseData.course.isFeatured}
        }) {
          id,
          title,
          cost,
          published,
          privacy,
          isBlog,
          description,
          featuredImage,
          isFeatured,
          slug,
          courseId
        }
      }
      `;
    }
    const fetch = new FetchBuilder()
      .setUrl(`${props.address.backend}/graph`)
      .setPayload(query)
      .setIsGraphQLEndpoint(true)
      .setAuthToken(props.auth.token)
      .build();
    try {
      const response = await fetch.exec();
      if (response.course) {
        setCourseDataWithDescription(response.course);
        props.markDirty(false);
        props.dispatch(setAppMessage(new AppMessage(APP_MESSAGE_COURSE_SAVED)));
      }
    } catch (err) {
      props.dispatch(setAppMessage(new AppMessage(err.message)));
    }
  };

  const onCourseDetailsChange = (e) => {
    changeCourseDetails(
      e.target.name,
      e.target.type === "checkbox" ? e.target.checked : e.target.value
    );
  };

  const changeCourseDetails = (key, value) => {
    props.markDirty(true);

    setCourseData(
      Object.assign({}, courseData, {
        course: Object.assign({}, courseData.course, {
          [key]: value,
        }),
      })
    );
  };

  const onDescriptionChange = (editorState) => {
    props.markDirty(true);

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

    try {
      props.dispatch(networkAction(true));
      const response = await queryGraphQL(
        `${props.address.backend}/graph`,
        query,
        props.auth.token
      );

      if (response.result) {
        setCourseData(
          Object.assign({}, courseData, {
            course: initCourseMetaData,
          })
        );
        props.closeEditor();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      props.dispatch(networkAction(false));
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
    course.lessons && setLessons([...lessons, ...course.lessons]);
  };

  const loadCourse = async (courseId) => {
    const query = `
    query {
      course: getCourse(id: "${courseId}") {
        title,
        cost,
        published,
        privacy,
        isBlog,
        description,
        featuredImage,
        id,
        lessons {
          id,
          title
        },
        isFeatured,
        slug,
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
      const response = await fetch.exec();
      if (response.course) {
        setCourseDataWithDescription(response.course);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const onFeaturedImageSelection = (url) =>
    changeCourseDetails("featuredImage", url);

  const closeDeleteCoursePopup = () => setDeleteCoursePopupOpened(false);

  const onAddLesson = () => {
    const emptyLessonWithLocalIndexKey = Object.assign(
      {},
      LessonEditor.emptyLesson,
      {
        lessonIndex: lessonIndex,
        courseId: courseData.course.id,
      }
    );
    setLessonIndex(lessonIndex + 1);
    setLessons([...lessons, emptyLessonWithLocalIndexKey]);
  };

  const onLessonDeleted = (lessonIndex) => {
    const indexOfDeletedLesson = lessons
      .map((lesson) => lesson.lessonIndex)
      .indexOf(lessonIndex);
    setLessons([
      ...lessons.slice(0, indexOfDeletedLesson),
      ...lessons.slice(indexOfDeletedLesson + 1),
    ]);
  };

  return (
    <Grid container direction="column">
      <Grid item xs>
        <Card>
          <form onSubmit={onCourseCreate}>
            <div className={classes.section}>
              <Typography variant="h4" className={classes.cardHeader}>
                {COURSE_DETAILS_CARD_HEADER}
              </Typography>

              {userError && <div>{userError}</div>}
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
              <Typography variant="body1">
                {COURSE_EDITOR_DESCRIPTION}
              </Typography>
              <TextEditor
                initialContentState={courseData.course.description}
                onChange={onDescriptionChange}
              />
              <Grid container alignItems="center">
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    type="number"
                    variant="outlined"
                    label="Cost"
                    fullWidth
                    margin="normal"
                    name="cost"
                    step="0.1"
                    value={courseData.course.cost}
                    onChange={onCourseDetailsChange}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl
                    variant="outlined"
                    className={classes.formControl}
                  >
                    <InputLabel
                      ref={inputLabel}
                      htmlFor="outlined-privacy-simple"
                    >
                      Privacy
                    </InputLabel>
                    <Select
                      autoWidth
                      value={courseData.course.privacy}
                      onChange={onCourseDetailsChange}
                      labelwidth={labelWidth}
                      inputProps={{
                        name: "privacy",
                        id: "outlined-privacy-simple",
                      }}
                    >
                      <MenuItem value="PUBLIC">Public</MenuItem>
                      <MenuItem value="PRIVATE">Private</MenuItem>
                      <MenuItem value="UNLISTED">Unlisted</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              <Grid container className={classes.controlRow}>
                <Grid item xs={12} sm={4}>
                  <Grid container justify="space-between" alignItems="center">
                    <Grid item>
                      <Typography variant="body1">
                        {BLOG_POST_SWITCH}
                      </Typography>
                    </Grid>
                    <Grid item>
                      <Switch
                        type="checkbox"
                        name="isBlog"
                        checked={courseData.course.isBlog}
                        onChange={onCourseDetailsChange}
                      />
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Grid container justify="space-between" alignItems="center">
                    <Grid item>
                      <Typography variant="body1">Published</Typography>
                    </Grid>
                    <Grid item>
                      <Switch
                        type="checkbox"
                        name="published"
                        checked={courseData.course.published}
                        onChange={onCourseDetailsChange}
                      />
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Grid container justify="space-between" alignItems="center">
                    <Grid item>
                      <Typography variant="body1">Featured course</Typography>
                    </Grid>
                    <Grid item>
                      <Switch
                        type="checkbox"
                        name="isFeatured"
                        checked={courseData.course.isFeatured}
                        onChange={onCourseDetailsChange}
                      />
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
              <MediaSelector
                title={FORM_FIELD_FEATURED_IMAGE}
                src={courseData.course.featuredImage}
                onSelection={onFeaturedImageSelection}
                mimeTypesToShow={[...MIMETYPE_IMAGE]}
              />
              <Grid container direction="row" spacing={2}>
                <Grid item>
                  <Button type="submit" variant="contained">
                    {BUTTON_SAVE}
                  </Button>
                </Grid>
                {courseData.course.id && (
                  <Grid item>
                    <Button>
                      <Link href={formulateCourseUrl(courseData.course)}>
                        <a className={classes.link} target="_blank">
                          {courseData.course.isBlog
                            ? VISIT_POST_BUTTON
                            : VISIT_COURSE_BUTTON}
                        </a>
                      </Link>
                    </Button>
                  </Grid>
                )}
              </Grid>
            </div>
          </form>
        </Card>
      </Grid>

      {courseData.course.id && (
        <Grid item container>
          {/* <button onClick={onCourseDelete}>Delete course</button> */}
          {!courseData.course.isBlog && (
            <Grid item container direction="column">
              {lessons.map((item, index) => (
                <Grid item key={index} className={classes.lessonItem}>
                  <LessonEditor
                    lesson={item}
                    onLessonDeleted={onLessonDeleted}
                    key={item.lessonIndex}
                  />
                </Grid>
              ))}
              <Grid item>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={onAddLesson}
                  startIcon={<Add />}
                  className={classes.addLesson}
                >
                  {BUTTON_NEW_LESSON_TEXT}
                </Button>
              </Grid>
            </Grid>
          )}
          <Grid item xs={12}>
            <Card>
              <div className={classes.section}>
                <Typography variant="h4" className={classes.cardHeader}>
                  {DANGER_ZONE_HEADER}
                </Typography>
                <Typography variant="body2">
                  {DANGER_ZONE_DESCRIPTION}
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => setDeleteCoursePopupOpened(true)}
                  startIcon={<Delete />}
                  className={classes.deleteButton}
                >
                  {BTN_DELETE_COURSE}
                </Button>
              </div>
            </Card>
          </Grid>
        </Grid>
      )}
      <AppDialog
        onOpen={deleteCoursePopupOpened}
        onClose={closeDeleteCoursePopup}
        title={DELETE_COURSE_POPUP_HEADER}
        actions={[
          { name: POPUP_CANCEL_ACTION, callback: closeDeleteCoursePopup },
          { name: POPUP_OK_ACTION, callback: onCourseDelete },
        ]}
      />
    </Grid>
  );
};

CourseEditor.propTypes = {
  auth: authProps,
  profile: profileProps,
  courseId: PropTypes.string,
  dispatch: PropTypes.func.isRequired,
  closeEditor: PropTypes.func.isRequired,
  markDirty: PropTypes.func.isRequired,
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

export default connect(mapStateToProps, mapDispatchToProps)(CourseEditor);
