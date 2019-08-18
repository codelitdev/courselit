import React, { useState } from 'react'
import Link from 'next/link'
import { publicCourse } from '../types'
import TextEditor from './TextEditor.js'
import { formattedLocaleDate } from '../lib/utils.js'
import {
  URL_EXTENTION_COURSES,
  FREE_COURSES_TEXT
} from '../config/constants.js'

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
      <h1 className="title">{ course.title }</h1>
      {description}
      <p>Updated on { formattedLocaleDate(course.updated) } by { course.creatorName }</p>
      <Link href={`/${URL_EXTENTION_COURSES}/${course.id}/${course.slug}`}>
        <a>Enroll for {course.cost === 0 ? FREE_COURSES_TEXT : course.cost}</a>
      </Link>
      <style jsx>{`
      `}</style>
    </article>
  )
}

CourseItem.propTypes = {
  course: publicCourse
}

export default CourseItem
