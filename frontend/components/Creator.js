/**
 * This component lets the admin create content.
 */
import React, { useState } from 'react'
import { connect } from 'react-redux'
import PropTypes from 'prop-types'
import {
  COURSE_CREATOR_BUTTON_TEXT,
  ERR_COURSE_TITLE_COST_REQUIRED
} from '../config/strings.js'
import {
  BACKEND,
  LESSON_TYPE_TEXT,
  LESSON_TYPE_AUDIO,
  LESSON_TYPE_VIDEO,
  LESSON_TYPE_PDF,
  LESSON_TYPE_QUIZ
} from '../config/constants.js'
import {
  queryGraphQL,
  capitalize
} from '../lib/utils.js'
import {
  authProps,
  profileProps
} from '../types.js'
import { networkAction } from '../redux/actions.js'

const Creator = (props) => {
  const initCourseMetaData = {
    title: '',
    cost: '',
    published: false,
    privacy: 'private',
    isBlog: false,
    description: '',
    featuredImage: '',
    id: null
  }
  const initCourseData = {
    course: initCourseMetaData,
    lessons: [],
    err: ''
  }
  const [courseFormVisible, setCourseFormVisible] = useState(false)
  const [courseData, setCourseData] = useState(initCourseData)

  const setError = (msg) => setCourseData(
    Object.assign({}, courseData, { err: msg || null })
  )

  const onCourseCreate = async (e) => {
    e.preventDefault()

    // validate the data
    if (!courseData.course.title ||
      !courseData.course.cost) {
      return setCourseData(
        Object.assign({}, courseData, {
          err: ERR_COURSE_TITLE_COST_REQUIRED
        })
      )
    }

    // clear error messages from previous submission
    setError()

    // console.log(courseData)
    const query = `
    mutation {
      course: createCourse(courseData: {
        title: "${courseData.course.title}",
        cost: ${courseData.course.cost},
        published: ${courseData.course.published},
        privacy: ${courseData.course.privacy.toUpperCase()},
        isBlog: ${courseData.course.isBlog},
        description: "${courseData.course.description}",
        featuredImage: "${courseData.course.featuredImage}"
      }) {
        id
      }
    }
    `

    try {
      props.dispatch(networkAction(true))
      let response = await queryGraphQL(
        `${BACKEND}/graph`,
        query,
        props.auth.token
      )

      if (response.course) {
        setCourseData(
          Object.assign({}, courseData, {
            course: Object.assign({}, courseData.course, {
              id: response.course.id
            })
          })
        )
      }
    } catch (err) {
      console.log(err)
    } finally {
      props.dispatch(networkAction(false))
    }
  }

  const onCourseDelete = async () => {
    const query = `
    mutation {
      result: deleteCourse(id: "${courseData.course.id}")
    }
    `

    try {
      props.dispatch(networkAction(true))
      let response = await queryGraphQL(
        `${BACKEND}/graph`,
        query,
        props.auth.token
      )

      if (response.result) {
        setCourseData(
          Object.assign({}, courseData, initCourseMetaData)
        )
      }
    } catch (err) {
      setError(err.message)
    } finally {
      props.dispatch(networkAction(false))
    }
  }

  const onCourseDetailsChange = (e) => {
    setCourseData(
      Object.assign({}, courseData, {
        course: Object.assign({}, courseData.course, {
          [e.target.name]: e.target.type === 'checkbox'
            ? e.target.checked : e.target.value
        })
      })
    )
  }

  const onLessonCreate = async (e, index) => {
    e.preventDefault()

    const lesson = courseData.lessons[index]

    // clear error messages from previous submission
    setError()

    if (lesson.id) {
      // update the existing record
      const query = `
      mutation {
        lesson: updateLesson(lessonData: {
          id: "${lesson.id}"
          title: "${lesson.title}",
          downloadable: ${lesson.downloadable},
          type: ${lesson.type.toUpperCase()},
          content: ${lesson.content !== '' ? '"' + lesson.content + '"' : null},
          contentURL: ${lesson.contentURL !== '' ? '"' + lesson.contentURL + '"' : null}
        }) {
          id,
          title,
          downloadable,
          type,
          content,
          contentURL
        }
      }
      `

      try {
        props.dispatch(networkAction(true))
        let response = await queryGraphQL(
          `${BACKEND}/graph`,
          query,
          props.auth.token
        )

        if (response.lesson) {
          console.log(response.lesson)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        props.dispatch(networkAction(false))
      }
    } else {
      // create a new record
      const query = `
      mutation {
        lesson: createLesson(lessonData: {
          title: "${lesson.title}",
          downloadable: ${lesson.downloadable},
          type: ${lesson.type.toUpperCase()},
          content: ${lesson.content !== '' ? '"' + lesson.content + '"' : null},
          contentURL: ${lesson.contentURL !== '' ? '"' + lesson.contentURL + '"' : null},
          courseId: "${courseData.course.id}"
        }) {
          id
        }
      }
      `

      try {
        props.dispatch(networkAction(true))
        let response = await queryGraphQL(
          `${BACKEND}/graph`,
          query,
          props.auth.token
        )

        if (response.lesson) {
          setCourseData(
            Object.assign({}, courseData, {
              lessons: [
                ...courseData.lessons.slice(0, index),
                Object.assign({}, lesson, {
                  id: response.lesson.id
                }),
                ...courseData.lessons.slice(index + 1)
              ]
            })
          )
        }
      } catch (err) {
        setError(err.message)
      } finally {
        props.dispatch(networkAction(false))
      }
    }
  }

  const onLessonDelete = async (index) => {
    let shouldRemoveLocal = false
    const lesson = courseData.lessons[index]

    // clear error messages from previous submission
    setError()

    if (lesson.id) {
      const query = `
      mutation r {
        result: deleteLesson(id: "${lesson.id}")
      }
      `

      try {
        props.dispatch(networkAction(true))
        let response = await queryGraphQL(
          `${BACKEND}/graph`,
          query,
          props.auth.token
        )

        if (response.result) {
          shouldRemoveLocal = true
        }
      } catch (err) {
        setError(err.message)
      }
    } else {
      shouldRemoveLocal = true
    }

    if (shouldRemoveLocal) {
      setCourseData(
        Object.assign({}, courseData, {
          lessons: [
            ...courseData.lessons.slice(0, index),
            ...courseData.lessons.slice(index + 1)
          ]
        })
      )
    }
  }

  const onAddLesson = (e) => {
    setCourseData(
      Object.assign({}, courseData, {
        lessons: [...courseData.lessons, {
          title: '',
          type: 'text',
          content: '',
          contentURL: '',
          downloadable: false
        }]
      })
    )
  }

  const onLessonDetailsChange = (e, index) => {
    setCourseData(
      Object.assign({}, courseData, {
        lessons: [
          ...courseData.lessons.slice(0, index),
          Object.assign({}, courseData.lessons[index], {
            [e.target.name]: e.target.type === 'checkbox'
              ? e.target.checked : e.target.value
          }),
          ...courseData.lessons.slice(index + 1)
        ]
      })
    )
    console.log(courseData.lessons)
  }

  return (<div>
    <button onClick={() => setCourseFormVisible(true)}>
      Create a course
    </button>
    {courseFormVisible &&
      <div>
        <div>
          <form onSubmit={onCourseCreate}>
            {courseData.err &&
              <div>{courseData.err}</div>
            }
            <label> Title:
              <input
                type='text'
                name='title'
                value={courseData.title}
                onChange={onCourseDetailsChange}/>
            </label>
            <label> Description:
              <textarea
                name='description'
                value={courseData.description}
                onChange={onCourseDetailsChange}/>
            </label>
            <label> Featured Image:
              <input
                type='url'
                name='featuredImage'
                value={courseData.featuredImage}
                onChange={onCourseDetailsChange}/>
            </label>
            <label> Cost:
              <input
                type='number'
                name='cost'
                value={courseData.cost}
                step="0.1"
                onChange={onCourseDetailsChange}/>
            </label>
            <label> Blog Post:
              <input
                type='checkbox'
                name='isBlog'
                defaultChecked={courseData.isBlog}
                onChange={onCourseDetailsChange}/>
            </label>
            <label> Privacy:
              <select
                name='privacy'
                value={courseData.privacy}
                onChange={onCourseDetailsChange}>
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="unlisted">Unlisted</option>
              </select>
            </label>
            <label> Published:
              <input
                type='checkbox'
                name='published'
                defaultChecked={courseData.published}
                onChange={onCourseDetailsChange}/>
            </label>
            <input type='submit' value={COURSE_CREATOR_BUTTON_TEXT}/>
          </form>
        </div>
        {courseData.course.id &&
          <div>
            <button onClick={onCourseDelete}>Delete course</button>
            {courseData.lessons.map(
              (item, index) => (
                <div key={index}>
                  <form onSubmit={(e) => onLessonCreate(e, index)}>
                    <label> Title:
                      <input
                        type='text'
                        name='title'
                        value={item.title}
                        onChange={(e) => onLessonDetailsChange(e, index)}/>
                    </label>
                    <label> Type:
                      <select
                        name='type'
                        value={item.type}
                        onChange={(e) => onLessonDetailsChange(e, index)}>
                        <option
                          value={LESSON_TYPE_TEXT}>
                          {capitalize(LESSON_TYPE_TEXT)}
                        </option>
                        <option
                          value={LESSON_TYPE_VIDEO}>
                          {capitalize(LESSON_TYPE_VIDEO)}
                        </option>
                        <option
                          value={LESSON_TYPE_PDF}>
                          {capitalize(LESSON_TYPE_PDF)}
                        </option>
                        <option
                          value={LESSON_TYPE_AUDIO}>
                          {capitalize(LESSON_TYPE_AUDIO)}
                        </option>
                        <option
                          value={LESSON_TYPE_QUIZ}>
                          {capitalize(LESSON_TYPE_QUIZ)}
                        </option>
                      </select>
                    </label>
                    <label> Content:
                      <textarea
                        name='content'
                        value={item.content}
                        onChange={(e) => onLessonDetailsChange(e, index)}/>
                    </label>
                    {(item.type !== LESSON_TYPE_TEXT &&
                      item.type !== LESSON_TYPE_QUIZ) &&
                      <label> {capitalize(item.type)} Url:
                        <input
                          type='url'
                          name='contentURL'
                          value={item.contentURL}
                          onChange={(e) => onLessonDetailsChange(e, index)}/>
                      </label>
                    }
                    <label> Downloadable:
                      <input
                        type='checkbox'
                        name='downloadable'
                        defaultChecked={item.downloadable}
                        onChange={(e) => onLessonDetailsChange(e, index)}/>
                    </label>
                    <input type='submit' value={COURSE_CREATOR_BUTTON_TEXT}/>
                  </form>
                  <button onClick={() => onLessonDelete(index)}>Remove lesson</button>
                </div>
              )
            )
            }
            <button onClick={onAddLesson}>Add lesson</button>
          </div>
        }
      </div>
    }
  </div>)
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
