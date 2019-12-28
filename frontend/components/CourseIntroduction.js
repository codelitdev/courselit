import React from 'react'
import { connect } from 'react-redux'
import { publicCourse } from '../types'
import { Grid } from '@material-ui/core'
import Article from './Article'

const CourseIntroduction = (props) => {
  const { course } = props
  const options = {
    showEnrollmentArea: true
  }

  return (
    <Grid container>
      {course && <Article course={course} options={options} />}
    </Grid>
  )
}

CourseIntroduction.propTypes = {
  course: publicCourse
}

const mapStateToProps = state => ({})

export default connect(mapStateToProps)(CourseIntroduction)
