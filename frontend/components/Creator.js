/**
 * This component lets the admin create content.
 */
import React, { useState, useEffect, useRef } from 'react'
import { connect } from 'react-redux'
import PropTypes from 'prop-types'
import {
  COURSE_CREATOR_BUTTON_TEXT,
  ERR_COURSE_TITLE_REQUIRED,
  ERR_COURSE_COST_REQUIRED
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

let creatorCoursesPaginationOffset = 1

const Creator = (props) => {
  const initCourseMetaData = {
    title: '',
    cost: '',
    published: false,
    privacy: 'PRIVATE',
    isBlog: false,
    description: '',
    featuredImage: '',
    id: null,
    isFeatured: false
  }
  const initCourseData = {
    course: initCourseMetaData,
    lessons: []
  }
  const [courseData, setCourseData] = useState(initCourseData)
  const [courseFormVisible, setCourseFormVisible] = useState(false)
  const [creatorCourses, setCreatorCourses] = useState([])

  // Following is used for displaying errors to the user
  const [userError, setUserError] = useState('')

  // The following ref is used for accessing previous state in hooks
  // Reference: https://reactjs.org/docs/hooks-faq.html#how-to-get-the-previous-props-or-state
  const prevCourseData = useRef()
  useEffect(() => {
    prevCourseData.current = courseData
  })

  // const setError = (msg) => setCourseData(
  //   Object.assign({}, courseData, { err: msg || '' })
  // )

  /**
   * A helper function to set user errors. To clear the error
   * already set, call setError().
   *
   * @param {String} msg an error message to show to the user
   */
  const setError = (msg = '') => setUserError(msg)

  const showCourseCreateForm = () => {
    setError()
    setCourseData(
      Object.assign({}, courseData, {
        course: initCourseMetaData
      })
    )
    setCourseFormVisible(true)
  }

  const onCourseCreate = async (e) => {
    e.preventDefault()

    // clear error messages from previous submission
    setError()

    // validate the data
    if (!courseData.course.title) {
      return setUserError(ERR_COURSE_TITLE_REQUIRED)
    }
    if (!courseData.course.isBlog && !courseData.course.cost) {
      return setUserError(ERR_COURSE_COST_REQUIRED)
    }

    let query = ''
    if (courseData.course.id) {
      // update the existing record
      query = `
      mutation {
        course: updateCourse(courseData: {
          id: "${courseData.course.id}"
          title: "${courseData.course.title}",
          cost: ${courseData.course.isBlog ? 0 : courseData.course.cost},
          published: ${courseData.course.published},
          privacy: ${courseData.course.privacy.toUpperCase()},
          isBlog: ${courseData.course.isBlog},
          description: "${courseData.course.description}",
          featuredImage: "${courseData.course.featuredImage}",
          isFeatured: ${courseData.course.isFeatured}
        }) {
          id,
          title,
          cost,
          published,
          privacy,
          isBlog,
          description,
          featuredImage,
          isFeatured
        }
      }
      `
    } else {
      // make a new record
      query = `
      mutation {
        course: createCourse(courseData: {
          title: "${courseData.course.title}",
          cost: ${courseData.course.isBlog ? 0 : courseData.course.cost},
          published: ${courseData.course.published},
          privacy: ${courseData.course.privacy.toUpperCase()},
          isBlog: ${courseData.course.isBlog},
          description: "${courseData.course.description}",
          featuredImage: "${courseData.course.featuredImage}",
          isFeatured: ${courseData.course.isFeatured}
        }) {
          id,
          title,
          cost,
          published,
          privacy,
          isBlog,
          description,
          featuredImage,
          isFeatured
        }
      }
      `
    }

    try {
      console.log(query)
      props.dispatch(networkAction(true))
      let response = await queryGraphQL(
        `${BACKEND}/graph`,
        query,
        props.auth.token
      )

      if (response.course) {
        setCourseData(
          Object.assign({}, courseData, {
            course: Object.assign({}, courseData.course, response.course)
          })
        )
      }
    } catch (err) {
      setError(err.message)
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
          Object.assign({}, courseData, {
            course: initCourseMetaData
          })
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
  }

  const loadCreatorCourse = async () => {
    const query = `
    query {
      courses: getCreatorCourses(id: "${props.profile.id}", offset: ${creatorCoursesPaginationOffset}) {
        id, title
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

      if (response.courses) {
        setCreatorCourses([...creatorCourses, ...response.courses])
        creatorCoursesPaginationOffset += 1
      }
    } catch (err) {
      setError(err.message)
    } finally {
      props.dispatch(networkAction(false))
    }
  }

  const loadCourse = async (courseId) => {
    setError()
    setCourseData(Object.assign({}, courseData, {
      lessons: []
    }))
    setCourseFormVisible(false)

    const query = `
    query {
      course: getCourse(id: "${courseId}") {
        title,
        cost,
        published,
        privacy,
        isBlog,
        description,
        featuredImage,
        id,
        lessons,
        isFeatured
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
            course: response.course,
            lessons: []
          })
        )

        setCourseFormVisible(true)

        // asynchronously load all lessons
        for (let i of response.course.lessons) {
          await loadLesson(i)
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      props.dispatch(networkAction(false))
    }
  }

  const loadLesson = async (id) => {
    const query = `
    query {
      lesson: getLesson(id: "${id}") {
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
        // converting NULLs to empty strings before setting state, to avoid a React warning.
        const lesson = {}
        for (let i of Object.keys(response.lesson)) {
          lesson[i] = response.lesson[i] === null ? '' : response.lesson[i]
        }

        setCourseData(Object.assign({}, prevCourseData.current, {
          lessons: [...prevCourseData.current.lessons, { ...lesson }]
        }))
      }
    } catch (err) {
      setError(err.message)
    } finally {
      props.dispatch(networkAction(false))
    }
  }

  return (<div>
    <div>
      <p>My Courses</p>
      {creatorCourses && <ul>
        {creatorCourses.map(
          (item, ind) => <li key={ind}>
            <a href="#" onClick={() => loadCourse(item.id)}>{item.title}</a>
          </li>
        )}
      </ul>}
      <button onClick={loadCreatorCourse}>Load my courses</button>
    </div>
    <div>
      <button onClick={showCourseCreateForm}>
        Create a course
      </button>
      {courseFormVisible &&
        <div>
          <div>
            <form onSubmit={onCourseCreate}>
              {userError &&
                <div>{userError}</div>
              }
              <label> Title:
                <input
                  type='text'
                  name='title'
                  value={courseData.course.title}
                  onChange={onCourseDetailsChange}/>
              </label>
              <label> Description:
                <textarea
                  name='description'
                  value={courseData.course.description}
                  onChange={onCourseDetailsChange}/>
              </label>
              <label> Featured Image:
                <input
                  type='url'
                  name='featuredImage'
                  value={courseData.course.featuredImage}
                  onChange={onCourseDetailsChange}/>
              </label>
              <label> Cost:
                <input
                  type='number'
                  name='cost'
                  value={courseData.course.cost}
                  step="0.1"
                  onChange={onCourseDetailsChange}/>
              </label>
              <label> Blog Post:
                <input
                  type='checkbox'
                  name='isBlog'
                  checked={courseData.course.isBlog}
                  onChange={onCourseDetailsChange}/>
              </label>
              <label> Privacy:
                <select
                  name='privacy'
                  value={courseData.course.privacy}
                  onChange={onCourseDetailsChange}>
                  <option value="PUBLIC">Public</option>
                  <option value="PRIVATE">Private</option>
                  <option value="UNLISTED">Unlisted</option>
                </select>
              </label>
              <label> Published:
                <input
                  type='checkbox'
                  name='published'
                  checked={courseData.course.published}
                  onChange={onCourseDetailsChange}/>
              </label>
              <label> Featured Course:
                <input
                  type='checkbox'
                  name='isFeatured'
                  checked={courseData.course.isFeatured}
                  onChange={onCourseDetailsChange}/>
              </label>
              <input type='submit' value={COURSE_CREATOR_BUTTON_TEXT}/>
            </form>
          </div>
          {courseData.course.id &&
            <div>
              <button onClick={onCourseDelete}>Delete course</button>
              {!courseData.course.isBlog &&
                (<div>
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
                      </div>)
                  )}
                  <button onClick={onAddLesson}>Add lesson</button>
                </div>)}
            </div>
          }
        </div>
      }
    </div>
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
