import { connect } from 'react-redux'
import ResponsiveDrawer from '../../../components/ResponsiveDrawer.js'
import Head from 'next/head'
import { formulateCourseUrl, getPostDescriptionSnippet, formulateMediaUrl } from '../../../lib/utils.js'
import { SupervisedUserCircle } from '@material-ui/icons'
import { FRONTEND, MEDIA_BACKEND } from '../../../config/constants.js'
import { SIDEBAR_TEXT_COURSE_INTRODUCTION } from '../../../config/strings.js'
import CourseIntroduction from '../../../components/CourseIntroduction.js'

const Course = (props) => {
  const { course } = props

  const lessons = []
  lessons.push({
    name: SIDEBAR_TEXT_COURSE_INTRODUCTION,
    element: <CourseIntroduction course={course} />
  })
  for (let lesson of course.lessons) {
    lessons.push({
      name: lesson.title,
      element: <></>,
      icon: <SupervisedUserCircle />
    })
  }

  return (
    <>
      <Head>
        <title>{course.title}</title>
        <meta property="og:url" content={formulateCourseUrl(course, FRONTEND)} />
        <meta property="og:type" content='article' />
        <meta property="og:title" content={course.title} />
        {/* <meta property="og:description" content={getPostDescriptionSnippet(course.description)} /> */}
        <meta property="og:author" content={course.creatorName} />
        {course.featuredImage &&
          <meta property="og:image" content={formulateMediaUrl(MEDIA_BACKEND, course.featuredImage)} />}
      </Head>
      <ResponsiveDrawer items={lessons} pageTitle={course.title} />
    </>
  )
}

Course.getInitialProps = props => {
  return {
    course: {
      id: '54353rdfgdfgd',
      title: 'A super simple course',
      description: 'A sample description',
      featuredImage: 'Yeah yeah',
      isBlog: false,
      slug: 'a-sample-slug',
      cost: 4.33,
      lessons: [
        {id: 1, progress: 50, title: 'Lesson 1', locked: false},
        {id: 2, progress: 0, title: 'Lesson 2', locked: true},
      ]
    }
  }
}

const mapStateToProps = state => ({
  profile: state.profile
})

export default connect(mapStateToProps)(Course)
