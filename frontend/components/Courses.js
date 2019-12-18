import React, { useState, useEffect } from 'react'
import { connect } from 'react-redux'
import PropTypes from 'prop-types'
import {
  authProps,
  profileProps
} from '../types.js'
import { makeStyles } from '@material-ui/styles'
import { Grid, Button, Typography } from '@material-ui/core'
import CourseEditor from './CourseEditor.js'
import CreatorCoursesList from './CreatorCoursesList.js'
import {
  NEW_COURSE_PAGE_HEADING,
  MANAGE_COURSES_PAGE_HEADING,
  BUTTON_CANCEL_TEXT,
  BUTTON_NEW_COURSE
} from '../config/strings.js'
import { useExecuteGraphQLQuery } from './CustomHooks.js'

const useStyles = makeStyles(theme => ({
  button: {
    margin: theme.spacing(1)
  }
}))

// let creatorCoursesPaginationOffset = 1

const Courses = (props) => {
  // const [courseFormVisible, setCourseFormVisible] = useState(false)
  const [coursesPaginationOffset, setCoursesPaginationOffset] = useState(1)
  const [creatorCourses, setCreatorCourses] = useState([])
  const classes = useStyles()
  const [courseEditorVisible, setCourseEditorVisible] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState(null)
  const executeGQLCall = useExecuteGraphQLQuery()
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

  useEffect(() => {
    console.log(coursesPaginationOffset)
    loadCreatorCourses()
  }, [props.profile.id])

  const loadCreatorCourses = async () => {
    if (!props.profile.id) { return }
    const query = `
    query {
      courses: getCreatorCourses(id: "${props.profile.id}", offset: ${coursesPaginationOffset}) {
        id, title
      }
    }
    `
    try {
      const response = await executeGQLCall(query)
      if (response.courses && response.courses.length > 0) {
        console.log(response.courses)
        setCreatorCourses([...creatorCourses, ...response.courses])
        setCoursesPaginationOffset(coursesPaginationOffset + 1)
        // creatorCoursesPaginationOffset += 1
      }
    } catch (err) {
      console.log(err)
    }

    // try {
    //   props.dispatch(networkAction(true))
    //   let response = await queryGraphQL(
    //     `${BACKEND}/graph`,
    //     query,
    //     props.auth.token
    //   )

    //   if (response.courses) {
    //     setCreatorCourses([...creatorCourses, ...response.courses])
    //     creatorCoursesPaginationOffset += 1
    //   }
    // } catch (err) {
    //   setError(err.message)
    // } finally {
    //   props.dispatch(networkAction(false))
    // }
  }

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

  const showEditor = (courseId) => {
    if (courseEditorVisible) {
      setCourseEditorVisible(false)
    } else {
      setSelectedCourse(courseId)
      setCourseEditorVisible(true)
    }
  }

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
              {courseEditorVisible ? NEW_COURSE_PAGE_HEADING : MANAGE_COURSES_PAGE_HEADING}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button
              variant='contained'
              color={courseEditorVisible ? 'default' : 'secondary'}
              className={classes.button}
              onClick={() => showEditor()}>
              {courseEditorVisible ? BUTTON_CANCEL_TEXT : BUTTON_NEW_COURSE}
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
        {!courseEditorVisible &&
          <CreatorCoursesList
            courses={creatorCourses}
            onClick={showEditor}
            onLoadMoreClick={loadCreatorCourses}/>}
        {courseEditorVisible && <CourseEditor courseId={selectedCourse}/>}
      </div>
    </div>
  )
}

Courses.propTypes = {
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
)(Courses)
