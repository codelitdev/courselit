import React, { useState, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import {
  authProps,
  profileProps
} from '../types.js'
import {
  ERR_COURSE_COST_REQUIRED,
  ERR_COURSE_TITLE_REQUIRED,
  COURSE_CREATOR_BUTTON_TEXT
} from '../config/strings.js'
import TextEditor from './TextEditor.js'
import { networkAction } from '../redux/actions.js'
import {
  queryGraphQL,
  queryGraphQLWithUIEffects,
  capitalize
} from '../lib/utils.js'
import {
  BACKEND,
  LESSON_TYPE_TEXT,
  LESSON_TYPE_AUDIO,
  LESSON_TYPE_VIDEO,
  LESSON_TYPE_PDF,
  LESSON_TYPE_QUIZ,
  URL_EXTENTION_POSTS,
  URL_EXTENTION_COURSES
} from '../config/constants.js'
import Link from 'next/link'
import {
  Grid,
  TextField,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  Button
} from '@material-ui/core'
import { makeStyles } from '@material-ui/styles'
import { useExecuteGraphQLQuery } from './CustomHooks.js'

const useStyles = makeStyles(theme => ({
  title: {
    marginTop: theme.spacing(3)
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: '100%'
  },
  editor: {
    border: `1px solid #cacaca`,
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
  controlRow: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2)
  }
}))

const CourseEditor = (props) => {
  const initCourseMetaData = {
    title: '',
    cost: '',
    published: false,
    privacy: 'PRIVATE',
    isBlog: false,
    description: TextEditor.emptyState(),
    featuredImage: '',
    id: null,
    isFeatured: false
  }
  const initCourseData = {
    course: initCourseMetaData,
    lessons: []
  }
  const [courseData, setCourseData] = useState(initCourseData)
  const [userError, setUserError] = useState('')
  // const executeGQLCall = queryGraphQLWithUIEffects(
  //   `${BACKEND}/graph`,
  //   props.dispatch,
  //   networkAction,
  //   props.auth.token
  // )
  const classes = useStyles()
  const executeGQLCall = useExecuteGraphQLQuery()

  // The following ref is used for accessing previous state in hooks
  // Reference: https://reactjs.org/docs/hooks-faq.html#how-to-get-the-previous-props-or-state
  const prevCourseData = useRef()
  useEffect(() => {
    // prevCourseData.current = courseData
    console.log(props.courseId)
    loadCourse(props.courseId)
  }, [props.courseId])

  // For privacy dropdown
  const inputLabel = React.useRef(null)
  const [labelWidth, setLabelWidth] = React.useState(0)
  useEffect(() => {
    setLabelWidth(inputLabel.current.offsetWidth)
  }, [])

  // To clear the error, call setError().
  const setError = (msg = '') => setUserError(msg)

  const onCourseCreate = async (e) => {
    console.log(`From onCourseCreate:`, courseData)
    e.preventDefault()
    setError()

    // validate the data
    if (!courseData.course.title) {
      return setUserError(ERR_COURSE_TITLE_REQUIRED)
    }
    if (!courseData.course.isBlog && !courseData.course.cost) {
      return setUserError(ERR_COURSE_COST_REQUIRED)
    }

    let query = ''
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
          isFeatured
        }
      }
      `
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
          isFeatured
        }
      }
      `
    }

    await executeGQLCall(query, response => {
      if (response.course) {
        setCourseDataWithDescription(response.course)
      }
    })

    // try {
    //   console.log(query)
    //   props.dispatch(networkAction(true))
    //   let response = await queryGraphQL(
    //     `${BACKEND}/graph`,
    //     query,
    //     props.auth.token
    //   )

    //   if (response.course) {
    //     setCourseData(
    //       Object.assign({}, courseData, {
    //         course: Object.assign({}, courseData.course, response.course)
    //       })
    //     )
    //   }
    // } catch (err) {
    //   setError(err.message)
    // } finally {
    //   props.dispatch(networkAction(false))
    // }
  }

  const onLessonDetailsChange = (e, index) => {
    setCourseData(
      Object.assign({}, courseData, {
        lessons: [
          ...courseData.lessons.slice(0, index),
          Object.assign({}, courseData.lessons[index], {
            [e.target.name]: e.target.type === 'checkbox'
              ? e.target.checked : e.target.value
          }),
          ...courseData.lessons.slice(index + 1)
        ]
      })
    )
  }

  const onCourseDetailsChange = (e) => {
    setCourseData(
      Object.assign({}, courseData, {
        course: Object.assign({}, courseData.course, {
          [e.target.name]: e.target.type === 'checkbox'
            ? e.target.checked : e.target.value
        })
      })
    )
  }

  const onDescriptionChange = (editorState) => {
    setCourseData(
      Object.assign({}, courseData, {
        course: Object.assign({}, courseData.course, {
          description: editorState
        })
      })
    )
  }

  const onCourseDelete = async () => {
    const query = `
    mutation {
      result: deleteCourse(id: "${courseData.course.id}")
    }
    `

    try {
      props.dispatch(networkAction(true))
      let response = await queryGraphQL(
        `${BACKEND}/graph`,
        query,
        props.auth.token
      )

      if (response.result) {
        setCourseData(
          Object.assign({}, courseData, {
            course: initCourseMetaData
          })
        )
      }
    } catch (err) {
      setError(err.message)
    } finally {
      props.dispatch(networkAction(false))
    }
  }

  const onLessonCreate = async (e, index) => {
    e.preventDefault()

    const lesson = courseData.lessons[index]

    // clear error messages from previous submission
    setError()

    if (lesson.id) {
      // update the existing record
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
        let response = await queryGraphQL(
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
    } else {
      // create a new record
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
        let response = await queryGraphQL(
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
  }

  const onAddLesson = (e) => {
    setCourseData(
      Object.assign({}, courseData, {
        lessons: [...courseData.lessons, {
          title: '',
          type: 'text',
          content: '',
          contentURL: '',
          downloadable: false
        }]
      })
    )
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
        let response = await queryGraphQL(
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

  const setCourseDataWithDescription = (course) =>
    setCourseData(
      Object.assign({}, courseData, {
        course: Object.assign({}, course, {
          description: TextEditor.hydrate(course.description)
        }),
        lessons: [...courseData.lessons]
      })
    )

  const loadCourse = async (courseId) => {
    setCourseData(Object.assign({}, courseData, {
      lessons: []
    }))

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
        lessons,
        isFeatured,
        slug
      }
    }
    `

    try {
      // props.dispatch(networkAction(true))
      // let response = await queryGraphQL(
      //   `${BACKEND}/graph`,
      //   query,
      //   props.auth.token
      // )
      await executeGQLCall(query, async response => {
        if (response.course) {
          setCourseDataWithDescription(response.course)
          // console.log(response.course)
          // const editorStateFromDescription = TextEditor.hydrate(response.course.description)
          // const descriptionDecodedCourseData = Object.assign({}, response.course, {
          //   description: editorStateFromDescription
          // })
          // console.log(`Decoded content: `,
          //   descriptionDecodedCourseData,
          //   editorStateFromDescription.getCurrentContent().getPlainText('\u0001'))
          // setCourseData(
          //   Object.assign({}, courseData, {
          //     course: descriptionDecodedCourseData,
          //     lessons: []
          //   })
          // )

          // setCourseFormVisible(true)

          // asynchronously load all lessons
          // for (let i of response.course.lessons) {
          //   await loadLesson(i)
          // }
        }
      })
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <div>
        <form onSubmit={onCourseCreate}>
          {userError &&
            <div>{userError}</div>
          }
          <TextField
            required
            variant='outlined'
            label='Title'
            fullWidth
            margin="normal"
            name='title'
            value={courseData.course.title}
            onChange={onCourseDetailsChange}/>
          <Grid container alignItems='center'>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                type='number'
                variant='outlined'
                label='Cost'
                fullWidth
                margin="normal"
                name='cost'
                step='0.1'
                value={courseData.course.cost}
                onChange={onCourseDetailsChange}/>
              {/* <label> Cost:
                <input
                  type='number'
                  name='cost'
                  value={courseData.course.cost}
                  step="0.1"
                  onChange={onCourseDetailsChange}/>
              </label> */}
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl variant='outlined' className={classes.formControl}>
                <InputLabel ref={inputLabel} htmlFor='outlined-privacy-simple'>
                  Privacy
                </InputLabel>
                <Select
                  autoWidth
                  value={courseData.course.privacy}
                  onChange={onCourseDetailsChange}
                  labelwidth={labelWidth}
                  inputProps={{
                    name: 'privacy',
                    id: 'outlined-privacy-simple'
                  }}>
                  <MenuItem value="PUBLIC">Public</MenuItem>
                  <MenuItem value="PRIVATE">Private</MenuItem>
                  <MenuItem value="UNLISTED">Unlisted</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <Grid container className={classes.controlRow}>
            <Grid item xs={12} sm={4}>
              <Grid
                container
                justify='space-between'
                alignItems='center'>
                <Grid item>
                  <Typography variant='body1'>
                    Blog post
                  </Typography>
                </Grid>
                <Grid item>
                  <Switch
                    type='checkbox'
                    name='isBlog'
                    checked={courseData.course.isBlog}
                    onChange={onCourseDetailsChange}/>
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Grid
                container
                justify='space-between'
                alignItems='center'>
                <Grid item>
                  <Typography variant='body1'>
                    Published
                  </Typography>
                </Grid>
                <Grid item>
                  <Switch
                    type='checkbox'
                    name='published'
                    checked={courseData.course.published}
                    onChange={onCourseDetailsChange}/>
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Grid
                container
                justify='space-between'
                alignItems='center'>
                <Grid item>
                  <Typography variant='body1'>
                    Featured course
                  </Typography>
                </Grid>
                <Grid item>
                  <Switch
                    type='checkbox'
                    name='isFeatured'
                    checked={courseData.course.isFeatured}
                    onChange={onCourseDetailsChange}/>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          <div></div>
          <Grid container className={classes.editor}>
            <Grid item xs={12} className={classes.editorLabel}>Description</Grid>
            <Grid item xs={12}>
              <TextEditor
                initialContentState={ courseData.course.description }
                onChange={onDescriptionChange}/>
            </Grid>
          </Grid>
          {/* <label> Description:
          </label> */}
          <label> Featured Image:
            <input
              type='url'
              name='featuredImage'
              value={courseData.course.featuredImage}
              onChange={onCourseDetailsChange}/>
          </label>
          <label> Blog Post:
            <input
              type='checkbox'
              name='isBlog'
              checked={courseData.course.isBlog}
              onChange={onCourseDetailsChange}/>
          </label>
          <label> Privacy:
            <select
              name='privacy'
              value={courseData.course.privacy}
              onChange={onCourseDetailsChange}>
              <option value="PUBLIC">Public</option>
              <option value="PRIVATE">Private</option>
              <option value="UNLISTED">Unlisted</option>
            </select>
          </label>
          <label> Published:
            <input
              type='checkbox'
              name='published'
              checked={courseData.course.published}
              onChange={onCourseDetailsChange}/>
          </label>
          <label> Featured Course:
            <input
              type='checkbox'
              name='isFeatured'
              checked={courseData.course.isFeatured}
              onChange={onCourseDetailsChange}/>
          </label>
          <Button
            variant='contained'
            type='submit'>
            {COURSE_CREATOR_BUTTON_TEXT}
          </Button>
          {/* <input type='submit' value={COURSE_CREATOR_BUTTON_TEXT}/> */}
        </form>
      </div>
      {courseData.course.id &&
        <div>
          <Link href={
            `/${courseData.course.isBlog ? URL_EXTENTION_POSTS : URL_EXTENTION_COURSES}/${courseData.course.id}/${courseData.course.slug}`
          }>
            <a>Visit { courseData.course.isBlog ? 'post' : 'course' }</a>
          </Link>
          <button onClick={onCourseDelete}>Delete course</button>
          {!courseData.course.isBlog &&
            (<div>
              {courseData.lessons.map(
                (item, index) => (
                  <div key={index}>
                    <form onSubmit={(e) => onLessonCreate(e, index)}>
                      <label> Title:
                        <input
                          type='text'
                          name='title'
                          value={item.title}
                          onChange={(e) => onLessonDetailsChange(e, index)}/>
                      </label>
                      <label> Type:
                        <select
                          name='type'
                          value={item.type}
                          onChange={(e) => onLessonDetailsChange(e, index)}>
                          <option
                            value={LESSON_TYPE_TEXT}>
                            {capitalize(LESSON_TYPE_TEXT)}
                          </option>
                          <option
                            value={LESSON_TYPE_VIDEO}>
                            {capitalize(LESSON_TYPE_VIDEO)}
                          </option>
                          <option
                            value={LESSON_TYPE_PDF}>
                            {capitalize(LESSON_TYPE_PDF)}
                          </option>
                          <option
                            value={LESSON_TYPE_AUDIO}>
                            {capitalize(LESSON_TYPE_AUDIO)}
                          </option>
                          <option
                            value={LESSON_TYPE_QUIZ}>
                            {capitalize(LESSON_TYPE_QUIZ)}
                          </option>
                        </select>
                      </label>
                      <label> Content:
                        <textarea
                          name='content'
                          value={item.content}
                          onChange={(e) => onLessonDetailsChange(e, index)}/>
                      </label>
                      {(item.type !== LESSON_TYPE_TEXT &&
                        item.type !== LESSON_TYPE_QUIZ) &&
                        <label> {capitalize(item.type)} Url:
                          <input
                            type='url'
                            name='contentURL'
                            value={item.contentURL}
                            onChange={(e) => onLessonDetailsChange(e, index)}/>
                        </label>
                      }
                      <label> Downloadable:
                        <input
                          type='checkbox'
                          name='downloadable'
                          defaultChecked={item.downloadable}
                          onChange={(e) => onLessonDetailsChange(e, index)}/>
                      </label>
                      <input type='submit' value={COURSE_CREATOR_BUTTON_TEXT}/>
                    </form>
                    <button onClick={() => onLessonDelete(index)}>Remove lesson</button>
                  </div>)
              )}
              <button onClick={onAddLesson}>Add lesson</button>
            </div>)}
        </div>
      }
    </div>
  )
}

CourseEditor.propTypes = {
  auth: authProps,
  profile: profileProps,
  courseId: PropTypes.string,
  dispatch: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  auth: state.auth,
  profile: state.profile
})

const mapDispatchToProps = dispatch => ({
  dispatch: dispatch
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(CourseEditor)
