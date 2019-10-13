import React from 'react'
import PropTypes from 'prop-types'
import CourseItem from './CourseItem.js'
import { creatorCourse } from '../types.js'
import { List, ListItem } from '@material-ui/core'

const CreatorCoursesList = (props) => {
  return (
    <List aria-label="courses">
      {props.courses.map(
        course => <ListItem key={course.id} onClick={e => props.onClick(course.id)} button>
          <CourseItem
            course={course}
            isPublicView={false}
            onClick={props.onClick}/>
        </ListItem>
      )}
    </List>
  )
}

CreatorCoursesList.propTypes = {
  courses: PropTypes.arrayOf(creatorCourse),
  onClick: PropTypes.func
}

export default CreatorCoursesList
