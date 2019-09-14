import React, { useState } from 'react'
import { connect } from 'react-redux'
import PropTypes from 'prop-types'
import {
  authProps,
  profileProps
} from '../types.js'
import { makeStyles } from '@material-ui/styles'
import { Grid, Button, Typography } from '@material-ui/core'
import CourseEditor from '../components/CourseEditor.js'
import { networkAction } from '../redux/actions.js'
import {
  // BACKEND,
  MANAGE_COURSES_PAGE_HEADING
} from '../config/strings.js'
import {
  queryGraphQL
} from '../lib/utils.js'

const useStyles = makeStyles(theme => ({
  button: {
    margin: theme.spacing(1)
  }
}))

let creatorCoursesPaginationOffset = 1

const Creator = (props) => {
  const [courseFormVisible, setCourseFormVisible] = useState(false)
  const [creatorCourses, setCreatorCourses] = useState([])
  const classes = useStyles()
  const [activeComponent, setActiveComponent] = useState(<CourseEditor />)
  // const [mediaManagerVisibility, setMediaManagerVisibility] = useState(false)

  // const showCourseCreateForm = () => {
  //   setError()
  //   setCourseData(
  //     Object.assign({}, courseData, {
  //       course: initCourseMetaData
  //     })
  //   )
  //   setCourseFormVisible(true)
  // }

  // const loadCreatorCourse = async () => {
  //   const query = `
  //   query {
  //     courses: getCreatorCourses(id: "${props.profile.id}", offset: ${creatorCoursesPaginationOffset}) {
  //       id, title
  //     }
  //   }
  //   `

  //   try {
  //     props.dispatch(networkAction(true))
  //     let response = await queryGraphQL(
  //       `${BACKEND}/graph`,
  //       query,
  //       props.auth.token
  //     )

  //     if (response.courses) {
  //       setCreatorCourses([...creatorCourses, ...response.courses])
  //       creatorCoursesPaginationOffset += 1
  //     }
  //   } catch (err) {
  //     setError(err.message)
  //   } finally {
  //     props.dispatch(networkAction(false))
  //   }
  // }

  // const loadCourse = async (courseId) => {
  //   setError()
  //   setCourseData(Object.assign({}, courseData, {
  //     lessons: []
  //   }))
  //   setCourseFormVisible(false)

  //   const query = `
  //   query {
  //     course: getCourse(id: "${courseId}") {
  //       title,
  //       cost,
  //       published,
  //       privacy,
  //       isBlog,
  //       description,
  //       featuredImage,
  //       id,
  //       lessons,
  //       isFeatured,
  //       slug
  //     }
  //   }
  //   `

  //   try {
  //     props.dispatch(networkAction(true))
  //     let response = await queryGraphQL(
  //       `${BACKEND}/graph`,
  //       query,
  //       props.auth.token
  //     )

  //     if (response.course) {
  //       const descriptionDecodedCourseData = Object.assign({}, response.course, {
  //         description: TextEditor.hydrate(response.course.description)
  //       })
  //       console.log(`Decoded content: `, descriptionDecodedCourseData)
  //       setCourseData(
  //         Object.assign({}, courseData, {
  //           course: descriptionDecodedCourseData,
  //           lessons: []
  //         })
  //       )

  //       setCourseFormVisible(true)

  //       // asynchronously load all lessons
  //       for (let i of response.course.lessons) {
  //         await loadLesson(i)
  //       }
  //     }
  //   } catch (err) {
  //     setError(err.message)
  //   } finally {
  //     props.dispatch(networkAction(false))
  //   }
  // }

  // const loadLesson = async (id) => {
  //   const query = `
  //   query {
  //     lesson: getLesson(id: "${id}") {
  //       id,
  //       title,
  //       downloadable,
  //       type,
  //       content,
  //       contentURL
  //     }
  //   }
  //   `

  //   try {
  //     props.dispatch(networkAction(true))
  //     let response = await queryGraphQL(
  //       `${BACKEND}/graph`,
  //       query,
  //       props.auth.token
  //     )

  //     if (response.lesson) {
  //       console.log(response.lesson)
  //       // converting NULLs to empty strings before setting state, to avoid a React warning.
  //       const lesson = {}
  //       for (let i of Object.keys(response.lesson)) {
  //         lesson[i] = response.lesson[i] === null ? '' : response.lesson[i]
  //       }

  //       setCourseData(Object.assign({}, prevCourseData.current, {
  //         lessons: [...prevCourseData.current.lessons, { ...lesson }]
  //       }))
  //     }
  //   } catch (err) {
  //     setError(err.message)
  //   } finally {
  //     props.dispatch(networkAction(false))
  //   }
  // }

  // const onMediaSelected = (mediaId) => {
  //   console.log(`Selected media: ${mediaId}`)
  // }

  // const toggleMediaManagerVisibility = (flag) => {
  //   setMediaManagerVisibility(flag)
  // }

  const showCourseCreateForm = (courseId) =>
    setActiveComponent(<CourseEditor courseId={courseId}/>)

  return (
    <div>
      <div>
        <Grid
          container
          direction='row'
          justify='space-between'
          alignItems='center'>
          <Grid item xs={12} sm={10}>
            <Typography variant='h3'>
              {MANAGE_COURSES_PAGE_HEADING}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button
              variant="contained"
              color="primary"
              className={classes.button}
              onClick={showCourseCreateForm}>
              New course
            </Button>
          </Grid>
        </Grid>
        {/* {creatorCourses && <ul>
          {creatorCourses.map(
            (item, ind) => <li key={ind}>
              <a href="#" onClick={() => loadCourse(item.id)}>{item.title}</a>
            </li>
          )}
        </ul>}
        <button onClick={loadCreatorCourse}>Load my courses</button> */}
      </div>
      <div>
        {activeComponent}
      </div>
    </div>
  )
}

Creator.propTypes = {
  auth: authProps,
  profile: profileProps,
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
)(Creator)
