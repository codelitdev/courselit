import React from 'react'
import PropTypes from 'prop-types'
import CourseItem from './CourseItem.js'
import { creatorCourse } from '../types.js'
import { List, ListItem, Button } from '@material-ui/core'
import {
  LOAD_MORE_TEXT
} from '../config/strings.js'

const CreatorCoursesList = (props) => {
  return (
    <div>
      <List aria-label="courses">
        {props.courses.map(
          course =>
          <ListItem key={course.id} onClick={e => props.onClick(course.id)} button>
            <CourseItem
              course={course}
              isPublicView={false}
              onClick={props.onClick}/>
          </ListItem>
        )}
      </List>
      <Button onClick={props.onLoadMoreClick}>
        {LOAD_MORE_TEXT}
      </Button>
    </div>
  )
}

CreatorCoursesList.propTypes = {
  courses: PropTypes.arrayOf(creatorCourse),
  onClick: PropTypes.func,
  onLoadMoreClick: PropTypes.func
}

export default CreatorCoursesList
