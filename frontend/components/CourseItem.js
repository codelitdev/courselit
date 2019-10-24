import React from 'react'
import PropTypes from 'prop-types'
import Link from 'next/link'
import { creatorCourse } from '../types'
import TextEditor from './TextEditor'
import { formattedLocaleDate } from '../lib/utils.js'
import {
  URL_EXTENTION_COURSES,
  FREE_COURSES_TEXT
} from '../config/constants.js'
import { ListItemText } from '@material-ui/core'

const CourseItem = (props) => {
  const { course } = props
  let description
  try {
    description = <TextEditor
      initialContentState={ TextEditor.hydrate(course.description) }
      readOnly={ true }/>
  } catch (e) {
    description = <p>Unable to display description</p>
  }

  return (
    <article>
      <ListItemText primary={course.title}></ListItemText>
      {/* <h1 className="title">{ course.title }</h1> */}
      {props.isPublicView &&
        <div>
          {description}
          <p>Updated on { formattedLocaleDate(course.updated) } by { course.creatorName }</p>
          <Link href={`/${URL_EXTENTION_COURSES}/${course.id}/${course.slug}`}>
            <a>Enroll for {course.cost === 0 ? FREE_COURSES_TEXT : course.cost}</a>
          </Link>
        </div>
      }
    </article>
  )
}

CourseItem.propTypes = {
  course: creatorCourse,
  isPublicView: PropTypes.bool.isRequired
}

export default CourseItem
