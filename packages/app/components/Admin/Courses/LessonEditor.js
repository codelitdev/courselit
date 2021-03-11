import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
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
} from "@material-ui/core";
import {
  BUTTON_SAVE,
  BUTTON_DELETE_LESSON_TEXT,
  LESSON_EDITOR_HEADER,
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
} from "../../../config/strings";
import {
  lesson as lessonType,
  authProps,
  addressProps,
} from "../../../types.js";
import {
  LESSON_TYPE_TEXT,
  LESSON_TYPE_AUDIO,
  LESSON_TYPE_VIDEO,
  LESSON_TYPE_PDF,
  LESSON_TYPE_QUIZ,
} from "../../../config/constants.js";
import { makeStyles } from "@material-ui/styles";
import MediaSelector from "../Media/MediaSelector.js";
import FetchBuilder from "../../../lib/fetch";
import { networkAction, setAppMessage } from "../../../redux/actions";
import { connect } from "react-redux";
import AppDialog from "../../Public/AppDialog";
import AppMessage from "../../../models/app-message.js";
import { Card, RichText as TextEditor } from "@courselit/components-library";

const useStyles = makeStyles((theme) => ({
  formControl: {
    marginBottom: theme.spacing(2),
    minWidth: "100%",
  },
  controlRow: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
    display: "flex",
    alignItems: "center",
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
  section: {
    background: "white",
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2),
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
  },
}));

const LessonEditor = (props) => {
  const [lesson, setLesson] = useState(props.lesson);
  const classes = useStyles();
  const inputLabel = React.useRef(null);
  const [labelWidth, setLabelWidth] = React.useState(0);
  const [deleteLessonPopupOpened, setDeleteLessonPopupOpened] = useState(false);

  useEffect(() => {
    setLabelWidth(inputLabel.current && inputLabel.current.offsetWidth);
  }, [lesson.type]);

  useEffect(() => {
    props.lesson.id && loadLesson(props.lesson.id);
  }, [props.lesson.id]);

  const loadLesson = async (id) => {
    const query = `
    query {
      lesson: getLesson(id: "${id}") {
        id,
        title,
        downloadable,
        type,
        content,
        contentURL,
        requiresEnrollment
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
      // setError(err.message)
    } finally {
      props.dispatch(networkAction(false));
    }
  };

  const onLessonCreate = async (e) => {
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
        contentURL: ${
          lesson.contentURL !== "" ? '"' + lesson.contentURL + '"' : null
        },
        requiresEnrollment: ${lesson.requiresEnrollment}
      }) {
        id,
        title,
        downloadable,
        type,
        content,
        contentURL
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
      await fetch.exec();
    } catch (err) {
      props.dispatch(setAppMessage(new AppMessage(err.message)));
    } finally {
      props.dispatch(networkAction(false));
      props.dispatch(setAppMessage(new AppMessage(APP_MESSAGE_LESSON_SAVED)));
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
        contentURL: ${
          lesson.contentURL !== "" ? '"' + lesson.contentURL + '"' : null
        },
        courseId: "${lesson.courseId}",
        requiresEnrollment: ${lesson.requiresEnrollment}
      }) {
        id
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
        setLesson(Object.assign({}, lesson, { id: response.lesson.id }));
        props.dispatch(setAppMessage(new AppMessage(APP_MESSAGE_LESSON_SAVED)));
      }
    } catch (err) {
      props.dispatch(setAppMessage(new AppMessage(err.message)));
    } finally {
      props.dispatch(networkAction(false));
    }
  };

  const onLessonDelete = async (index) => {
    setDeleteLessonPopupOpened(false);
    // setError()

    if (lesson.id) {
      const query = `
      mutation r {
        result: deleteLesson(id: "${lesson.id}")
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

        if (response.result) {
          props.dispatch(
            setAppMessage(new AppMessage(APP_MESSAGE_LESSON_DELETED))
          );
        }
      } catch (err) {
        props.dispatch(setAppMessage(new AppMessage(err.message)));
      }
    }

    props.onLessonDeleted(lesson.lessonIndex);
  };

  const onLessonDetailsChange = (e) =>
    setLesson(
      Object.assign({}, lesson, {
        [e.target.name]:
          e.target.type === "checkbox" ? e.target.checked : e.target.value,
      })
    );

  const changeTextContent = (editorState) =>
    setLesson(Object.assign({}, lesson, { content: editorState }));

  const closeDeleteLessonPopup = () => setDeleteLessonPopupOpened(false);

  return (
    <Card>
      <div className={classes.section}>
        <Typography variant="h6">{LESSON_EDITOR_HEADER}</Typography>
        {lesson.type && (
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
            <FormControl variant="outlined" className={classes.formControl}>
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
                  value={String.prototype.toUpperCase.call(LESSON_TYPE_TEXT)}
                >
                  {capitalize(LESSON_TYPE_TEXT)}
                </MenuItem>
                <MenuItem
                  value={String.prototype.toUpperCase.call(LESSON_TYPE_VIDEO)}
                >
                  {capitalize(LESSON_TYPE_VIDEO)}
                </MenuItem>
                <MenuItem
                  value={String.prototype.toUpperCase.call(LESSON_TYPE_AUDIO)}
                >
                  {capitalize(LESSON_TYPE_AUDIO)}
                </MenuItem>
                <MenuItem
                  value={String.prototype.toUpperCase.call(LESSON_TYPE_PDF)}
                >
                  {capitalize(LESSON_TYPE_PDF)}
                </MenuItem>
                {/* <MenuItem value={LESSON_TYPE_QUIZ}>
                {capitalize(LESSON_TYPE_QUIZ)}
              </MenuItem> */}
              </Select>
            </FormControl>
            {![
              String.prototype.toUpperCase.call(LESSON_TYPE_TEXT),
              String.prototype.toUpperCase.call(LESSON_TYPE_QUIZ),
            ].includes(lesson.type) && (
              <div className={classes.formControl}>
                <MediaSelector
                  title={CONTENT_URL_LABEL}
                  src={lesson.contentURL}
                  onSelection={(mediaId) =>
                    setLesson(
                      Object.assign({}, lesson, { contentURL: mediaId })
                    )
                  }
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
            {[LESSON_TYPE_VIDEO, LESSON_TYPE_AUDIO, LESSON_TYPE_PDF].includes(
              lesson.type
            ) && (
              <Grid
                container
                justify="space-between"
                alignItems="center"
                className={classes.formControl}
              >
                <Grid item>
                  <Typography variant="body1">{DOWNLOADABLE_SWITCH}</Typography>
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
              justify="space-between"
              alignItems="center"
              className={classes.formControl}
            >
              <Grid item>
                <Typography variant="body1" color="textSecondary">
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
        )}
        <Grid container direction="row" spacing={2}>
          <Grid item>
            <Button onClick={onLessonCreate} variant="contained">
              {BUTTON_SAVE}
            </Button>
          </Grid>
          <Grid item>
            <Button
              onClick={() => setDeleteLessonPopupOpened(true)}
              variant="contained"
            >
              {BUTTON_DELETE_LESSON_TEXT}
            </Button>
          </Grid>
        </Grid>
      </div>
      <AppDialog
        onOpen={deleteLessonPopupOpened}
        onClose={closeDeleteLessonPopup}
        title={DELETE_LESSON_POPUP_HEADER}
        actions={[
          { name: POPUP_CANCEL_ACTION, callback: closeDeleteLessonPopup },
          { name: POPUP_OK_ACTION, callback: onLessonDelete },
        ]}
      ></AppDialog>
    </Card>
  );
};

LessonEditor.emptyLesson = {
  title: "",
  type: String.prototype.toUpperCase.call(LESSON_TYPE_TEXT),
  content: TextEditor.emptyState(),
  contentURL: "",
  downloadable: false,
  requiresEnrollment: false,
};

LessonEditor.propTypes = {
  onLessonDeleted: PropTypes.func.isRequired,
  auth: authProps,
  dispatch: PropTypes.func.isRequired,
  lesson: lessonType,
  address: addressProps,
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  address: state.address,
});

const mapDispatchToProps = (dispatch) => ({
  dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(LessonEditor);
