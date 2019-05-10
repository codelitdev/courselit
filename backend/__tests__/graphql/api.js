/**
 * @jest-environment node
 */

/**
  * This is a test suite containing unit tests for the GraphQL API.
  */
const graphql = require('graphql').graphql
const schema = require('../../src/graphql/schema.js')
const User = require('../../src/models/User.js')
const Lesson = require('../../src/models/Lesson.js')
const Course = require('../../src/models/Course.js')
const responses = require('../../src/config/strings.js').responses
const constants = require('../../src/config/constants.js')
require('../../src/config/db.js')
const mongoose = require('mongoose')
const slugify = require('slugify')

describe('GraphQL API tests', () => {
  const user = 'graphuser@test.com'
  const user2 = 'graphuser2@test.com'
  let createdLessonId = ''
  let createdCourseId = ''
  let createdCourseId2 = ''

  afterAll(done => {
    User.deleteMany({ email: { $in: [user, user2] } })
      .then(() => Lesson.findOneAndDelete({ _id: mongoose.Types.ObjectId(createdLessonId) }))
      // .then(() => Course.findOneAndDelete({ _id: mongoose.Types.ObjectId(createdCourseId) }))
      .then(() => Course.deleteMany({ _id: { $in: [createdCourseId, createdCourseId2] } }))
      .then(() => {
        mongoose.connection.close()
        done()
      })
  })

  beforeAll(done => {
    User.create([
      { email: user, password: 'lol' },
      { email: user2, password: 'lol' }
    ], data => done())
  })

  /**
   * Test suite for 'User' related functions.
   */
  describe('users', () => {
    it('get details', async () => {
      const query = /* GraphQL */ `
      {
        user: getUser(email: "${user2}") {
          email,
          verified
        }
      }
      `
      const result = await graphql(schema, query, {}, { user: { email: user } })
      expect(result).toHaveProperty('data')
      expect(result.data.user.email).toBe(user2)
      expect(result.data.user.verified).toBeNull()
    })

    it('change name via unauthenticate request', async () => {
      const newName = 'New name'
      const mutation = `
      mutation {
        updateName(name: "${newName}") {
          email,
          name
        }
      }
      `

      const result = await graphql(schema, mutation, null, {})
      expect(result).toHaveProperty('errors')
      expect(result.errors[0].message).toBe(responses.request_not_authenticated)
    })

    it('change name via authenticated request', async () => {
      const newName = 'New name'
      const mutation = `
      mutation {
        updateName(name: "${newName}") {
          email,
          name
        }
      }
      `

      const result = await graphql(schema, mutation, null, { user: { email: user } })
      expect(result).not.toHaveProperty('errors')
      expect(result.data.updateName.email).toBe(user)
      expect(result.data.updateName.name).toBe(newName)
    })
  })

  /**
   * Test suite for 'Course' related functions.
   */
  describe('courses', () => {
    it('creating a course via an unauthenticated request', async () => {
      const mutation = `
      mutation {
        createCourse(courseData: {
          title: "First course",
          cost: 3,
          privacy: UNLISTED,
          published: true,
          isBlog: true
        }) {
          id,
        }
      }
      `

      const result = await graphql(schema, mutation, null, {})
      expect(result).toHaveProperty('errors')
      expect(result.errors[0].message).toBe(responses.request_not_authenticated)
    })

    it('creating a normal private course', async () => {
      const user = {
        _id: mongoose.Types.ObjectId('000000000000000000000000'),
        isCreator: true
      }
      const mutation = `
      mutation {
        course: createCourse(courseData: {
          title: "First course [via testing]",
          cost: 3.99,
          privacy: PRIVATE,
          published: true,
          isBlog: true
        }) {
          id,
          cost
        }
      }
      `

      const result = await graphql(schema, mutation, null, { user })
      expect(result).toHaveProperty('data')
      expect(result.data).toHaveProperty('course')
      expect(result.data.course).toHaveProperty('id')
      expect(result.data.course.id).not.toBeNull()
      expect(result.data.course.cost).toBe(3.99)

      createdCourseId = result.data.course.id
    })

    it('creating a normal course but User.isCreator is false', async () => {
      const user = {
        _id: mongoose.Types.ObjectId('000000000000000000000000'),
        isCreator: false
      }
      const mutation = `
      mutation {
        course: createCourse(courseData: {
          title: "First course [via testing]",
          cost: 3.99,
          privacy: PRIVATE,
          published: true,
          isBlog: true
        }) {
          id,
          cost
        }
      }
      `

      const result = await graphql(schema, mutation, null, { user })
      expect(result).toHaveProperty('errors')
      expect(result.errors[0].message).toBe(responses.not_a_creator)
    })

    it('get a private course\'s details as a third party', async () => {
      const userId = mongoose.Types.ObjectId('000000000000000000000001')
      const query = `
      query {
        course: getCourse(id: "${createdCourseId}") {
          id,
        }
      }
      `

      const result = await graphql(schema, query, null, { user: { _id: userId } })
      expect(result).toHaveProperty('errors')
      expect(result.errors[0].message).toBe(responses.item_not_found)
    })

    it('get a private course\'s details as the owner', async () => {
      const userId = mongoose.Types.ObjectId('000000000000000000000000')
      const query = `
      query {
        course: getCourse(id: "${createdCourseId}") {
          id,
          privacy
        }
      }
      `

      const result = await graphql(schema, query, null, { user: { _id: userId } })
      expect(result).toHaveProperty('data')
      expect(result.data).toHaveProperty('course')
      expect(result.data.course.id).toBe(createdCourseId)
      expect(result.data.course.privacy).toBe(constants.closed.toUpperCase())
    })

    it('accessing an unpublished course', async () => {
      const owner = {
        _id: mongoose.Types.ObjectId('000000000000000000000000'),
        isCreator: true
      }
      const accessor = {
        _id: mongoose.Types.ObjectId('000000000000000000000001')
      }
      const mutation = `
      mutation {
        course: createCourse(courseData: {
          title: "First course [via testing]",
          cost: 3.99,
          privacy: PUBLIC,
          published: false,
          isBlog: true
        }) {
          id,
          cost
        }
      }
      `

      const result = await graphql(schema, mutation, null, { user: owner })
      expect(result).toHaveProperty('data')
      expect(result.data.course).toHaveProperty('id')
      createdCourseId2 = result.data.course.id

      const query = `
      query q{
        getCourse(id: "${result.data.course.id}") {
          id,
          title
        }
      }
      `
      const queryResult = await graphql(schema, query, null, { user: accessor })
      expect(queryResult).toHaveProperty('errors')
      expect(queryResult.errors[0].message).toBe(responses.item_not_found)
    })

    it('update a course as a third party', async () => {
      const userId = mongoose.Types.ObjectId('000000000000000000000001')
      const newTitle = 'edited via test'
      const mutation = `
      mutation {
        updateCourse(courseData: {
          id: "${createdCourseId}",
          title: "${newTitle}"
        }) {
          id,
          title
        }
      }
      `

      const result = await graphql(schema, mutation, null, { user: { _id: userId } })
      expect(result).toHaveProperty('errors')
      expect(result.errors[0].message).toBe(responses.item_not_found)
    })

    it('update a course as the owner', async () => {
      const userId = mongoose.Types.ObjectId('000000000000000000000000')
      const newTitle = 'edited via test'
      const mutation = `
      mutation {
        updateCourse(courseData: {
          id: "${createdCourseId}",
          title: "${newTitle}"
        }) {
          id,
          title
        }
      }
      `

      const result = await graphql(schema, mutation, null, { user: { _id: userId } })
      expect(result).toHaveProperty('data')
      expect(result.data).toHaveProperty('updateCourse')
      expect(result.data.updateCourse.title).toBe(newTitle)
    })

    it('delete a course as a third party', async () => {
      const userId = mongoose.Types.ObjectId('000000000000000000000001')
      const mutation = `
      mutation {
        deleteCourse(id: "${createdCourseId2}")
      }
      `

      const result = await graphql(schema, mutation, null, { user: { _id: userId } })
      expect(result).toHaveProperty('errors')
      expect(result.errors[0].message).toBe(responses.item_not_found)
    })

    it('delete a course as the owner', async () => {
      const userId = mongoose.Types.ObjectId('000000000000000000000000')
      const mutation = `
      mutation {
        deleteCourse(id: "${createdCourseId2}")
      }
      `

      const result = await graphql(schema, mutation, null, { user: { _id: userId } })
      expect(result).toHaveProperty('data')
      expect(result.data).toHaveProperty('deleteCourse')
      expect(result.data.deleteCourse).toBeTruthy()
    })

    it('adding a lesson to a course as a third party', async () => {
      const userId = mongoose.Types.ObjectId('000000000000000000000001')
      const imaginaryLessonId = '100000000000000000000001'
      const mutation = `
      mutation e {
        addLesson(courseId: "${createdCourseId}", 
          lessonId: "${imaginaryLessonId}")
      }
      `
      const result = await graphql(schema, mutation, null, { user: { _id: userId } })
      expect(result).toHaveProperty('errors')
      expect(result.errors[0].message).toBe(responses.item_not_found)
    })

    it('adding a lesson to a course as the owner', async () => {
      const userId = mongoose.Types.ObjectId('000000000000000000000000')
      const imaginaryLessonId = '100000000000000000000001'
      const mutation = `
      mutation e {
        addLesson(courseId: "${createdCourseId}", 
          lessonId: "${imaginaryLessonId}")
      }
      `
      const result = await graphql(schema, mutation, null, { user: { _id: userId } })
      expect(result).toHaveProperty('data')
      expect(result.data).toHaveProperty('addLesson')
      expect(result.data.addLesson).toBeTruthy()
    })

    it('getting courses created by user but the request not authenticated', async () => {
      const query = `
      query y {
        getCreatorCourses(id: "000000000000000000000000", offset: 1) {
          id, title
        }
      }
      `

      const result = await graphql(schema, query, null, {})
      expect(result).toHaveProperty('errors')
      expect(result.errors[0].message).toBe(responses.request_not_authenticated)
    })

    it('getting first page of courses created by user', async () => {
      const userId = mongoose.Types.ObjectId('000000000000000000000000')
      const query = `
      query y {
        getCreatorCourses(id: "000000000000000000000000", offset: 1) {
          id, title
        }
      }
      `

      const result = await graphql(schema, query, null, { user: { _id: userId } })
      expect(result).toHaveProperty('data')
      expect(result.data).toHaveProperty('getCreatorCourses')
      expect(result.data.getCreatorCourses.length).toBe(1)
    })

    it('removing a lesson', async () => {
      const userId = mongoose.Types.ObjectId('000000000000000000000000')
      const imaginaryLessonId = '100000000000000000000001'
      const mutation = `
      mutation e {
        removeLesson(courseId: "${createdCourseId}", 
          lessonId: "${imaginaryLessonId}")
      }
      `
      await graphql(schema, mutation, null, { user: { _id: userId } })

      const query = `
      query q{
        getCourse(id: "${createdCourseId}") {
          id,
          title,
          lessons
        }
      }
      `
      const result = await graphql(schema, query, null, { user: { _id: userId } })
      expect(result).toHaveProperty('data')
      expect(result.data).toHaveProperty('getCourse')
      expect(result.data.getCourse.lessons).not.toContain(imaginaryLessonId)
    })
  })

  /**
   * Test suite for 'Lesson' related functions.
   */
  describe('lessons', () => {
    it('creating a lesson via unauthenticated request', async () => {
      const mutation = `
      mutation {
        createLesson(lessonData: {
          type: TEXT,
          title: "first post",
          content: "THis is so awesome",
          courseId: "100000000000000000000000"
        }){
          slug
        }
      }
      `

      const result = await graphql(schema, mutation, null, {})
      expect(result).toHaveProperty('errors')
      expect(result.errors[0].message).toBe(responses.request_not_authenticated)
    })

    it('creating a text lesson but content missing', async () => {
      const mutation = `
      mutation {
        createLesson(lessonData: {
          title: "so bad", 
          type: TEXT,
          courseId: "100000000000000000000000"
        }) {
          title
        }
      }
      `

      const result = await graphql(schema, mutation, null, { user: { email: user } })
      expect(result).toHaveProperty('errors')
      expect(result.errors[0].message).toBe(responses.content_cannot_be_null)
    })

    it('creating a video lesson but content URL missing', async () => {
      const mutation = `
      mutation {
        createLesson(lessonData: {
          title: "so bad", 
          type: VIDEO,
          courseId: "100000000000000000000000"
        }) {
          title
        }
      }
      `

      const result = await graphql(schema, mutation, null, { user: { email: user } })
      expect(result).toHaveProperty('errors')
      expect(result.errors[0].message).toBe(responses.content_url_cannot_be_null)
    })

    // Note: A similar test for "PDF" content has been skipped because the
    // intention was just to ensure that the OR clause was working fine.
    it('creating an audio lesson but content URL missing', async () => {
      const mutation = `
      mutation {
        createLesson(lessonData: {
          title: "so bad", 
          type: AUDIO,
          courseId: "100000000000000000000000"
        }) {
          title
        }
      }
      `

      const result = await graphql(schema, mutation, null, { user: { email: user } })
      expect(result).toHaveProperty('errors')
      expect(result.errors[0].message).toBe(responses.content_url_cannot_be_null)
    })

    it('creating a valid (video) lesson but courseId belongs a non-existing course', async () => {
      const title = 'faky faky'
      const contentUrlString = 'http://fakeurl'
      const mongoId = '000000000000000000000000'
      const userID = mongoose.Types.ObjectId(mongoId)
      const mutation = `
      mutation {
        lesson: createLesson(lessonData: {
          title: "${title}", 
          type: VIDEO,
          contentURL: "${contentUrlString}",
          downloadable: true,
          courseId: "100000000000000000000000"
        }) {
          id
          type,
          title,
          content,
          downloadable,
          slug,
          creatorId,
          contentURL
        }
      }
      `

      const result = await graphql(schema, mutation, null, { user: { _id: userID } })
      expect(result).toHaveProperty('errors')
      expect(result.errors[0].message).toBe(responses.item_not_found)
    })

    it('creating a valid (video) lesson', async () => {
      const title = 'faky faky'
      const contentUrlString = 'http://fakeurl'
      const mongoId = '000000000000000000000000'
      const userID = mongoose.Types.ObjectId(mongoId)
      const mutation = `
      mutation {
        lesson: createLesson(lessonData: {
          title: "${title}", 
          type: VIDEO,
          contentURL: "${contentUrlString}",
          downloadable: true,
          courseId: "${createdCourseId}"
        }) {
          id
          type,
          title,
          content,
          downloadable,
          slug,
          creatorId,
          contentURL
        }
      }
      `

      const result = await graphql(schema, mutation, null, { user: { _id: userID } })
      expect(result).not.toHaveProperty('errors')
      const { lesson } = result.data
      expect(lesson.slug).toBe(slugify(title))
      expect(lesson.creatorId).toBe(mongoId)
      expect(lesson.type).toBe('VIDEO')
      expect(lesson.title).toBe(title)
      expect(lesson.downloadable).toBe(true)
      expect(lesson.content).toBe(null)
      expect(lesson.contentURL).toBe(contentUrlString)
      createdLessonId = lesson.id
    })

    it('delete a non-existent lesson', async () => {
      const userId = '000000000000000000000000'
      const lessonId = '100000000000000000000001'
      const lessonID = mongoose.Types.ObjectId(lessonId)
      const userID = mongoose.Types.ObjectId(userId)
      const mutation = `
      mutation e {
        deleteLesson(id: "${lessonID}")
      }
      `
      const result = await graphql(schema, mutation, null, { user: { _id: userID } })
      expect(result).toHaveProperty('errors')
      expect(result.errors[0].message).toBe(responses.item_not_found)
    })

    it('delete an existing lesson', async () => {
      const userId = '000000000000000000000000'
      const userID = mongoose.Types.ObjectId(userId)
      const mutation = `
      mutation e {
        deleteLesson(id: "${createdLessonId}")
      }
      `
      const result = await graphql(schema, mutation, null, { user: { _id: userID } })
      expect(result).not.toHaveProperty('errors')
      expect(result.data.deleteLesson).toBeTruthy()
    })

    it('deleting an existing but not-owned lesson', async () => {
      const title = 'faky faky'
      const contentUrlString = 'http://fakeurl'
      const mongoId = '000000000000000000000000'
      const mongoId2 = '000000000000000000000001'
      const userID = mongoose.Types.ObjectId(mongoId)
      const userID2 = mongoose.Types.ObjectId(mongoId2)
      const mutation = `
      mutation {
        lesson: createLesson(lessonData: {
          title: "${title}", 
          type: VIDEO,
          contentURL: "${contentUrlString}",
          downloadable: true,
          courseId: "${createdCourseId}"
        }) {
          id
          type,
          title,
          content,
          downloadable,
          slug,
          creatorId,
          contentURL
        }
      }
      `

      const result = await graphql(schema, mutation, null, { user: { _id: userID } })
      const { lesson } = result.data
      const deleteMutation = `
      mutation e {
        deleteLesson(id: "${mongoose.Types.ObjectId(lesson.id)}")
      }
      `
      const deleteResult = await graphql(schema, deleteMutation, null, { user: { _id: userID2 } })
      expect(deleteResult).toHaveProperty('errors')
      expect(deleteResult.errors[0].message).toBe(responses.item_not_found)
      createdLessonId = lesson.id
    })

    it('Change title', async () => {
      const mongoId = '000000000000000000000000'
      const userID = mongoose.Types.ObjectId(mongoId)
      const newTitle = 'morphed'
      const mutation = `
      mutation  {
        changeTitle(id: "${createdLessonId}", newTitle: "${newTitle}") {
          id,
          title,
          type
        }
      }`
      const result = await graphql(schema, mutation, null, { user: { _id: userID } })
      expect(result).not.toHaveProperty('errors')
      expect(result.data.changeTitle.title).toBe(newTitle)
    })

    it('Change content', async () => {
      const mongoId = '000000000000000000000000'
      const userID = mongoose.Types.ObjectId(mongoId)
      const newContent = 'changed content'
      const mutation = `
      mutation  {
        changeContent(id: "${createdLessonId}", content: "${newContent}") {
          content
        }
      }`
      const result = await graphql(schema, mutation, null, { user: { _id: userID } })
      expect(result).not.toHaveProperty('errors')
      expect(result.data.changeContent.content).toBe(newContent)
    })

    it('Change content url', async () => {
      const mongoId = '000000000000000000000000'
      const userID = mongoose.Types.ObjectId(mongoId)
      const newContentURL = 'http://fakyfaky'
      const mutation = `
      mutation  {
        changeContentURL(id: "${createdLessonId}", url: "${newContentURL}") {
          contentURL
        }
      }`
      const result = await graphql(schema, mutation, null, { user: { _id: userID } })
      expect(result).not.toHaveProperty('errors')
      expect(result.data.changeContentURL.contentURL).toBe(newContentURL)
    })

    // it('Change downloadable status', async () => {
    //   const mongoId = '000000000000000000000000'
    //   const userID = mongoose.Types.ObjectId(mongoId)
    //   // make it true
    //   let flag = true
    //   let mutation = `
    //   mutation  {
    //     changeDownloadable(id: "${createdLessonId}", flag: ${flag}) {
    //       downloadable
    //     }
    //   }`
    //   let result = await graphql(schema, mutation, null, { user: { _id: userID } })
    //   expect(result).not.toHaveProperty('errors')
    //   expect(result.data.changeDownloadable.downloadable).toBeTruthy()

    //   // make it false
    //   flag = false
    //   mutation = `
    //   mutation  {
    //     changeDownloadable(id: "${createdLessonId}", flag: ${flag}) {
    //       downloadable
    //     }
    //   }`
    //   result = await graphql(schema, mutation, null, { user: { _id: userID } })
    //   expect(result).not.toHaveProperty('errors')
    //   expect(result.data.changeDownloadable.downloadable).toBeFalsy()
    // })

    it('Change downloadable status via update function', async () => {
      const mongoId = '000000000000000000000000'
      const userID = mongoose.Types.ObjectId(mongoId)
      const mutation = `
      mutation  {
        lesson: updateLesson(lessonData: {
          id: "${createdLessonId}"
          downloadable: true
        }) {
          id
          downloadable
        }
      }`
      const result = await graphql(schema, mutation, null, { user: { _id: userID } })
      expect(result).not.toHaveProperty('errors')
      expect(result.data.lesson.id).toBe(createdLessonId)
      expect(result.data.lesson.downloadable).toBeTruthy()
    })

    it('Change content url via update function', async () => {
      const mongoId = '000000000000000000000000'
      const userID = mongoose.Types.ObjectId(mongoId)
      const newContentURL = 'http://fakyfaky'
      const mutation = `
      mutation  {
        lesson: updateLesson(lessonData: {
          id: "${createdLessonId}"
          contentURL: "${newContentURL}"
        }) {
          id
          contentURL
        }
      }`
      const result = await graphql(schema, mutation, null, { user: { _id: userID } })
      expect(result).not.toHaveProperty('errors')
      expect(result.data.lesson.id).toBe(createdLessonId)
      expect(result.data.lesson.contentURL).toBe(newContentURL)
    })
  })

  /**
   * Test suite for testing miscellaneous functions.
   */
  describe('miscellaneous', () => {
    it('Deleting a non empty course', async () => {
      const userId = mongoose.Types.ObjectId('000000000000000000000000')
      const mutation = `
      mutation {
        deleteCourse(id: "${createdCourseId}")
      }
      `

      const result = await graphql(schema, mutation, null, { user: { _id: userId } })
      expect(result).toHaveProperty('errors')
      expect(result.errors[0].message).toBe(responses.course_not_empty)
    })
  })
})
