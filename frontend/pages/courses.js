import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { publicCourse } from '../types.js'
import CourseItem from '../components/CourseItem.js'
import { queryGraphQL } from '../lib/utils.js'
import { BACKEND } from '../config/constants.js'
import { BTN_LOAD_MORE } from '../config/strings.js'
import MasterLayout from './masterlayout.js'

const Courses = (props) => {
  const [courses, setCourses] = useState(props.courses)
  const [hasMorePages, setHasMorePages] = useState(true)

  const getMoreCourses = async () => {
    if (hasMorePages) {
      pageOffset += 1
      const moreCourses = await getCourses()
      if (moreCourses.length > 0) {
        setCourses([...courses, ...moreCourses])
      } else {
        setHasMorePages(false)
      }
    }
  }

  return (
    <MasterLayout>
      {courses.map(course => <CourseItem course={course} key={course.id}/>)}
      <button
        onClick={getMoreCourses}
        disabled={hasMorePages ? null : 'disabled'}>{BTN_LOAD_MORE}</button>
    </MasterLayout>
  )
}

let pageOffset = 1
const getQuery = () => `
  query {
    courses: getPublicCourses(offset: ${pageOffset}) {
      id
      title,
      description,
      featuredImage,
      updated,
      creatorName,
      cost,
      slug,
      isFeatured
    }
  }
`

const getCourses = async () => {
  let courses = []
  try {
    const response = await queryGraphQL(`${BACKEND}/graph`, getQuery())
    courses = response.courses
  } catch (e) {
    // do nothing
  }
  return courses
}

Courses.getInitialProps = async (props) => {
  const courses = await getCourses()
  return { courses }
}

Courses.propTypes = {
  courses: PropTypes.arrayOf(publicCourse)
}

export default Courses
