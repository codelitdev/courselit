import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import {
  Card,
  CardContent,
  CardActions,
  Button, 
  TextField,
  Typography,
  Grid,
  Switch,
  Select,
  FormControl,
  InputLabel,
  MenuItem
} from "@material-ui/core"
import {
  BUTTON_SAVE,
  BUTTON_DELETE_LESSON_TEXT,
  LESSON_EDITOR_HEADER,
  DOWNLOADABLE_SWITCH,
  TYPE_DROPDOWN,
  LESSON_CONTENT_HEADER,
  CONTENT_URL_LABEL
} from "../config/strings"
import {lesson as lessonType} from '../types.js'
import {
  BACKEND,
  LESSON_TYPE_TEXT,
  LESSON_TYPE_AUDIO,
  LESSON_TYPE_VIDEO,
  LESSON_TYPE_PDF,
  LESSON_TYPE_QUIZ
} from '../config/constants.js'
import { capitalize } from '../lib/utils'
import { makeStyles } from '@material-ui/styles'
import TextEditor from './TextEditor'
import MediaSelector from './MediaSelector'

const useStyles = makeStyles(theme => ({
  formControl: {
    marginBottom: theme.spacing(2),
    minWidth: '100%'
  },
  controlRow: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
    display: 'flex',
    alignItems: 'center'
  },
  editor: {
    border: '1px solid #cacaca',
    borderRadius: '6px',
    padding: '10px 8px',
    maxHeight: 300,
    overflow: 'auto',
    marginBottom: theme.spacing(2)
  },
  editorLabel: {
    fontSize: '1em',
    marginBottom: theme.spacing(1)
  },
}))

const LessonEditor = (props) => {
  console.log(props.lesson)
  const [lesson, setLesson] = useState(props.lesson || LessonEditor.emptyLesson)
  const [error, setError] = useState('')
  const classes = useStyles()
  const inputLabel = React.useRef(null)
  const [labelWidth, setLabelWidth] = React.useState(0)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setLabelWidth(inputLabel.current.offsetWidth)
  }, [])

  const onLessonCreate = async (e) => {
    e.preventDefault()
    setError('')

    if (lesson.id) {
      await updateLesson()
    } else {
      await createLesson()
    }
  }

  const updateLesson = async () => {
    const query = `
    mutation {
      lesson: updateLesson(lessonData: {
        id: "${lesson.id}"
        title: "${lesson.title}",
        downloadable: ${lesson.downloadable},
        type: ${lesson.type.toUpperCase()},
        content: ${lesson.content !== '' ? '"' + lesson.content + '"' : null},
        contentURL: ${lesson.contentURL !== '' ? '"' + lesson.contentURL + '"' : null}
      }) {
        id,
        title,
        downloadable,
        type,
        content,
        contentURL
      }
    }
    `

    try {
      props.dispatch(networkAction(true))
      const response = await queryGraphQL(
        `${BACKEND}/graph`,
        query,
        props.auth.token
      )

      if (response.lesson) {
        console.log(response.lesson)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      props.dispatch(networkAction(false))
    }
  }

  const createLesson = async () => {
    const query = `
    mutation {
      lesson: createLesson(lessonData: {
        title: "${lesson.title}",
        downloadable: ${lesson.downloadable},
        type: ${lesson.type.toUpperCase()},
        content: ${lesson.content !== '' ? '"' + lesson.content + '"' : null},
        contentURL: ${lesson.contentURL !== '' ? '"' + lesson.contentURL + '"' : null},
        courseId: "${courseData.course.id}"
      }) {
        id
      }
    }
    `

    try {
      props.dispatch(networkAction(true))
      const response = await queryGraphQL(
        `${BACKEND}/graph`,
        query,
        props.auth.token
      )

      if (response.lesson) {
        setCourseData(
          Object.assign({}, courseData, {
            lessons: [
              ...courseData.lessons.slice(0, index),
              Object.assign({}, lesson, {
                id: response.lesson.id
              }),
              ...courseData.lessons.slice(index + 1)
            ]
          })
        )
      }
    } catch (err) {
      setError(err.message)
    } finally {
      props.dispatch(networkAction(false))
    }
  }

  const onLessonDelete = async (index) => {
    let shouldRemoveLocal = false
    const lesson = courseData.lessons[index]

    // clear error messages from previous submission
    setError()

    if (lesson.id) {
      const query = `
      mutation r {
        result: deleteLesson(id: "${lesson.id}")
      }
      `

      try {
        props.dispatch(networkAction(true))
        const response = await queryGraphQL(
          `${BACKEND}/graph`,
          query,
          props.auth.token
        )

        if (response.result) {
          shouldRemoveLocal = true
        }
      } catch (err) {
        setError(err.message)
      }
    } else {
      shouldRemoveLocal = true
    }

    if (shouldRemoveLocal) {
      setCourseData(
        Object.assign({}, courseData, {
          lessons: [
            ...courseData.lessons.slice(0, index),
            ...courseData.lessons.slice(index + 1)
          ]
        })
      )
    }
  }

  const onLessonDetailsChange = (e) =>
    setLesson(
      Object.assign({}, lesson, {
        [e.target.name]: e.target.type === 'checkbox'
          ? e.target.checked : e.target.value
      })
    )

  const changeTextContent = (editorState) => setLesson(
    Object.assign({}, lesson, {content: editorState})
  )

  return (
    <Card>
      <CardContent>
        <Typography variant='h6'>
          {LESSON_EDITOR_HEADER}
        </Typography>
        <form onSubmit={onLessonCreate}>
          <TextField
            required
            variant='outlined'
            label='Title'
            fullWidth
            margin="normal"
            name='title'
            value={lesson.title}
            onChange={onLessonDetailsChange}
            className={classes.formControl}/>
          <FormControl variant='outlined' className={classes.formControl}>
            <InputLabel ref={inputLabel} id="select-type">
              {TYPE_DROPDOWN}
            </InputLabel>
            <Select
              labelId="select-type"
              id="demo-simple-select-outlined"
              value={lesson.type}
              onChange={onLessonDetailsChange}
              labelWidth={labelWidth}
              inputProps={{
                name: 'type'
              }}
            >
              <MenuItem value={LESSON_TYPE_TEXT}>
                {capitalize(LESSON_TYPE_TEXT)}
              </MenuItem>
              <MenuItem value={LESSON_TYPE_VIDEO}>
                {capitalize(LESSON_TYPE_VIDEO)}
              </MenuItem>
              <MenuItem value={LESSON_TYPE_AUDIO}>
                {capitalize(LESSON_TYPE_AUDIO)}
              </MenuItem>
              <MenuItem value={LESSON_TYPE_PDF}>
                {capitalize(LESSON_TYPE_PDF)}
              </MenuItem>
              {/* <MenuItem value={LESSON_TYPE_QUIZ}>
                {capitalize(LESSON_TYPE_QUIZ)}
              </MenuItem> */}
            </Select>
          </FormControl>
          {![LESSON_TYPE_TEXT, LESSON_TYPE_QUIZ].includes(lesson.type) &&
            <div className={classes.formControl}>
              <MediaSelector
                title={CONTENT_URL_LABEL}
                src={lesson.contentURL}
                onSelection={(mediaId) => setLesson(
                  Object.assign({}, lesson, {contentURL: mediaId})
                )}
                />
            </div>}
          <Grid
            container
            className={classes.formControl}
            alignItems='center'
            justify='space-between'>
            <Grid item>
              <Typography variant='body1'>
                {LESSON_CONTENT_HEADER}
              </Typography>
            </Grid>
            <Grid item>
              <TextEditor
                initialContentState={lesson.content}
                onChange={changeTextContent} />
              {/* <IconButton onClick={() => setOpen(true)}>
                <Edit />
              </IconButton> */}
            </Grid>
          </Grid>
          {[LESSON_TYPE_VIDEO,
            LESSON_TYPE_AUDIO,
            LESSON_TYPE_PDF
            ].includes(lesson.type) &&
            <Grid
              container
              justify='space-between'
              alignItems='center'
              className={classes.formControl}>
              <Grid item>
                <Typography variant='body1'>
                  {DOWNLOADABLE_SWITCH}
                </Typography>
              </Grid>
              <Grid item>
                <Switch
                  type='checkbox'
                  name='downloadable'
                  checked={lesson.downloadable}
                  onChange={onLessonDetailsChange}/>
              </Grid>
            </Grid>}
        </form>
      </CardContent>
      <CardActions>
        <Button>
          {BUTTON_SAVE}
        </Button>
        <Button>
          {BUTTON_DELETE_LESSON_TEXT}
        </Button>
      </CardActions>
    </Card>
  )
}

LessonEditor.emptyLesson = {
  title: '',
  type: LESSON_TYPE_TEXT,
  content: TextEditor.emptyState(),
  contentURL: '',
  downloadable: false
}

LessonEditor.propTypes = {
  onLessonCreated: PropTypes.func.isRequired,
  onLessonUpdated: PropTypes.func,
  lessonIndexOnCourseEditorPage: PropTypes.number,
  // lesson: lessonType
}

export default LessonEditor