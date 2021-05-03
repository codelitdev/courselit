import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { authProps, profileProps, addressProps } from "../../../../types.js";
import {
  BTN_DELETE_COURSE,
  ERR_COURSE_COST_REQUIRED,
  ERR_COURSE_TITLE_REQUIRED,
  BUTTON_SAVE,
  FORM_FIELD_FEATURED_IMAGE,
  BUTTON_MANAGE_LESSONS_TEXT,
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
  BTN_PUBLISH,
  BTN_UNPUBLISH,
  APP_MESSAGE_COURSE_DELETED,
  COURSE_SETTINGS_CARD_HEADER,
} from "../../../../config/strings.js";
import { networkAction, setAppMessage } from "../../../../redux/actions.js";
import {
  queryGraphQL,
  formulateCourseUrl,
  checkPermission,
} from "../../../../lib/utils.js";
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
import { Delete } from "@material-ui/icons";
import AppMessage from "../../../../models/app-message.js";
import { MIMETYPE_IMAGE, permissions } from "../../../../config/constants.js";
import FetchBuilder from "../../../../lib/fetch";
import { Section, RichText as TextEditor } from "@courselit/components-library";
import dynamic from "next/dynamic";
import { withStyles } from "@material-ui/styles";

const AppDialog = dynamic(() => import("../../../Public/AppDialog.js"));
const MediaSelector = dynamic(() => import("../../Media/MediaSelector"));
const CourseStructureEditor = dynamic(() => import("./CourseStructureEditor"));

const styles = {
  formControl: {
    minWidth: "100%",
  },
};

// TODO: Refactor away closeEditor() and markDirty()
const CourseEditor = (props) => {
  const initCourseMetaData = {
    title: "",
    cost: "",
    published: false,
    privacy: "UNLISTED",
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
  const [
    courseStructureEditorActive,
    setCourseStructureEditorActive,
  ] = useState(false);

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
      // update the existing record
      query = `
      mutation {
        course: updateCourse(courseData: {
          id: "${courseData.course.id}"
          title: "${courseData.course.title}",
          cost: ${courseData.course.isBlog ? 0 : courseData.course.cost},
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
      // make a new record
      query = `
      mutation {
        course: createCourse(courseData: {
          title: "${courseData.course.title}",
          cost: ${courseData.course.isBlog ? 0 : courseData.course.cost}
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
          featuredImage,
          isFeatured,
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
      .setUrl(`${props.address.backend}/graph`)
      .setPayload(query)
      .setIsGraphQLEndpoint(true)
      .setAuthToken(props.auth.token)
      .build();
    try {
      props.dispatch(networkAction(true));
      const response = await fetch.exec();
      if (response.course) {
        setCourseDataWithDescription(response.course);
        props.markDirty(false);
        props.dispatch(setAppMessage(new AppMessage(APP_MESSAGE_COURSE_SAVED)));
      }
    } catch (err) {
      props.dispatch(setAppMessage(new AppMessage(err.message)));
    } finally {
      props.dispatch(networkAction(false));
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
        closeDeleteCoursePopup();
        props.closeEditor();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      props.dispatch(networkAction(false));
      props.dispatch(setAppMessage(new AppMessage(APP_MESSAGE_COURSE_DELETED)));
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
      .setUrl(`${props.address.backend}/graph`)
      .setPayload(query)
      .setIsGraphQLEndpoint(true)
      .setAuthToken(props.auth.token)
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

  const onFeaturedImageSelection = (media) =>
    changeCourseDetails("featuredImage", media.file);

  const closeDeleteCoursePopup = () => setDeleteCoursePopupOpened(false);

  return (
    <Grid container direction="column" spacing={2}>
      {!courseStructureEditorActive && (
        <Grid item xs>
          <form onSubmit={onCourseCreate}>
            <Grid container spacing={2}>
              <Grid item sm={12} md={8}>
                <Section>
                  <Typography variant="h4">
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
                </Section>
              </Grid>

              <Grid item sm={12} md={4}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Section>
                      <Grid container direction="row" justify="space-between">
                        <Grid item>
                          <Button type="submit">{BUTTON_SAVE}</Button>
                        </Grid>
                        {!courseData.course.isBlog && courseData.course.id && (
                          <Grid item>
                            <Button
                              onClick={() =>
                                setCourseStructureEditorActive(true)
                              }
                            >
                              {BUTTON_MANAGE_LESSONS_TEXT}
                            </Button>
                          </Grid>
                        )}
                        {courseData.course.id && (
                          <>
                            {checkPermission(props.profile.permissions, [
                              permissions.publishCourse,
                            ]) && (
                              <Grid item>
                                <Button onClick={togglePublishedStatus}>
                                  {courseData.course.published
                                    ? BTN_UNPUBLISH
                                    : BTN_PUBLISH}
                                </Button>
                              </Grid>
                            )}
                            {courseData.course.published && (
                              <Grid item>
                                <Button>
                                  <Link
                                    href={formulateCourseUrl(courseData.course)}
                                  >
                                    <a target="_blank">
                                      {courseData.course.isBlog
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
                      <Grid container spacing={2} direction="column">
                        <Grid item>
                          <Typography variant="h4">
                            {COURSE_SETTINGS_CARD_HEADER}
                          </Typography>
                        </Grid>
                        <Grid item>
                          <Grid
                            container
                            justify="space-between"
                            alignItems="center"
                          >
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
                            value={courseData.course.cost}
                            onChange={onCourseDetailsChange}
                          />
                        </Grid>
                        <Grid item>
                          <FormControl
                            variant="outlined"
                            className={props.classes.formControl}
                          >
                            <InputLabel
                              ref={inputLabel}
                              htmlFor="outlined-privacy-simple"
                            >
                              Privacy
                            </InputLabel>
                            <Select
                              value={courseData.course.privacy}
                              onChange={onCourseDetailsChange}
                              labelwidth={labelWidth}
                              inputProps={{
                                name: "privacy",
                                id: "outlined-privacy-simple",
                              }}
                            >
                              <MenuItem value="PUBLIC">Public</MenuItem>
                              <MenuItem value="UNLISTED">Unlisted</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item>
                          <MediaSelector
                            title={FORM_FIELD_FEATURED_IMAGE}
                            src={courseData.course.featuredImage}
                            onSelection={onFeaturedImageSelection}
                            mimeTypesToShow={[...MIMETYPE_IMAGE]}
                          />
                        </Grid>
                        {!courseData.course.isBlog && (
                          <Grid item>
                            <Grid
                              container
                              justify="space-between"
                              alignItems="center"
                            >
                              <Grid item>
                                <Typography variant="body1">
                                  Featured course
                                </Typography>
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
                        )}
                      </Grid>
                    </Section>
                  </Grid>

                  <Grid item xs={12}>
                    <Section>
                      <Grid container direction="column" spacing={2}>
                        <Grid item>
                          <Typography variant="h4">
                            {DANGER_ZONE_HEADER}
                          </Typography>
                        </Grid>
                        <Grid item>
                          <Typography variant="body1">
                            {DANGER_ZONE_DESCRIPTION}
                          </Typography>
                        </Grid>
                        <Grid item>
                          <Button
                            variant="contained"
                            color="secondary"
                            onClick={() => setDeleteCoursePopupOpened(true)}
                            startIcon={<Delete />}
                          >
                            {BTN_DELETE_COURSE}
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
          onCloseView={() => setCourseStructureEditorActive(false)}
        />
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

  // TODO: Refactor away the following two properties.
  closeEditor: PropTypes.func.isRequired,
  markDirty: PropTypes.func.isRequired,

  address: addressProps,
  classes: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  profile: state.profile,
  address: state.address,
});

const mapDispatchToProps = (dispatch) => ({
  dispatch: dispatch,
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withStyles(styles)(CourseEditor));
