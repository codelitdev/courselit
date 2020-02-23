import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import FetchBuilder from '../lib/fetch'
import { BACKEND } from '../config/constants'
import { connect } from 'react-redux'
import { networkAction } from '../redux/actions'
import TextEditor from './TextEditor'
import { Typography, Card, CardContent } from '@material-ui/core'
import {
  ENROLL_IN_THE_COURSE,
  USER_ERROR_HEADER
} from '../config/strings'
import { makeStyles } from '@material-ui/styles'
import { lesson, authProps, profileProps } from '../types'

const useStyles = makeStyles(theme => ({
  notEnrolledHeader: {
    marginBottom: theme.spacing(1)
  }
}))

const LessonViewer = (props) => {
  const [lesson, setLesson] = useState(props.lesson)
  const [isEnrolled] =
    useState(!lesson.requiresEnrollment ||
      (props.profile &&
        props.profile.purchases.includes(props.lesson.courseId))
    )
  const classes = useStyles()

  useEffect(() => {
    props.lesson.id && isEnrolled && loadLesson(props.lesson.id)
  })

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
    `

    const fetch = new FetchBuilder()
      .setUrl(`${BACKEND}/graph`)
      .setPayload(query)
      .setIsGraphQLEndpoint(true)
      .setAuthToken(props.auth.token)
      .build()

    try {
      props.dispatch(networkAction(true))
      const response = await fetch.exec()

      if (response.lesson) {
        console.log(response.lesson)
        setLesson(Object.assign({}, response.lesson, {
          content: TextEditor.hydrate(response.lesson.content)
        }))
      }
    } catch (err) {
      console.log(err)
    } finally {
      props.dispatch(networkAction(false))
    }
  }

  return (
    <>
      {!isEnrolled &&
        <Card>
          <CardContent>
            <Typography variant='body1' color="textSecondary" className={classes.notEnrolledHeader}>
              {USER_ERROR_HEADER}
            </Typography>
            <Typography variant='h5'>
              {ENROLL_IN_THE_COURSE}
            </Typography>
          </CardContent>
        </Card>
      }
      {isEnrolled &&
        <Card>
          <CardContent>
            <Typography variant='h3'>
              {lesson.title}
            </Typography>
          </CardContent>
        </Card>
      }
    </>
  )
}

LessonViewer.propTypes = {
  lesson: lesson,
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
)(LessonViewer)
