/**
 * @jest-environment node
 */

/**
  * This is a test suite containing unit tests for the GraphQL API.
  */
const mongoose = require('mongoose')
const slugify = require('slugify')
const graphql = require('graphql').graphql

const schema = require('../../src/graphql/schema.js')

const User = require('../../src/models/User.js')
const Lesson = require('../../src/models/Lesson.js')
const Course = require('../../src/models/Course.js')
const SiteInfo = require('../../src/models/SiteInfo.js')

const responses = require('../../src/config/strings.js').responses
const constants = require('../../src/config/constants.js')
require('../../src/config/db.js')

describe('GraphQL API tests', () => {
  const user = 'graphuser@test.com'
  const user2 = 'graphuser2@test.com'
  let createdLessonId = ''
  let createdCourseId = ''
  let createdCourseId2 = ''
  let createdCourseId3 = ''

  afterAll(done => {
    User.deleteMany({ email: { $in: [user, user2] } })
      .then(() => Lesson.findOneAndDelete({ _id: mongoose.Types.ObjectId(createdLessonId) }))
      .then(() => Course.deleteMany({ _id: {
        $in: [createdCourseId, createdCourseId2, createdCourseId3]
      } }))
      .then(() => {
        mongoose.connection.close()
        done()
      })
  })

  beforeAll(done => {
    User.create([
      { email: user, password: 'lol', name: 'Tester #1' },
      { email: user2, password: 'lol', name: 'Tester #2' }
    ])
      .then(() => SiteInfo.deleteMany({}))
      .then(() => done())
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

    it('change name via unauthenticated request', async () => {
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

      const result = await graphql(schema, mutation, null, {
        user: {
          email: user,
          save: function () { return this }
        }
      })
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
          isBlog: true,
          isFeatured: false
        }) {
          id,
        }
      }
      `

      const result = await graphql(schema, mutation, null, {})
      expect(result).toHaveProperty('errors')
      expect(result.errors[0].message).toBe(responses.request_not_authenticated)
    })

    it('creating a normal course but User.isCreator is false', async () => {
      const user = {
        _id: mongoose.Types.ObjectId('000000000000000000000000'),
        isCreator: false,
        name: 'Tester'
      }
      const mutation = `
      mutation {
        course: createCourse(courseData: {
          title: "First course [via testing]",
          cost: 3.99,
          privacy: PRIVATE,
          published: true,
          isBlog: true,
          isFeatured: false
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

    it('creating a normal private course', async () => {
      const user = {
        _id: mongoose.Types.ObjectId('000000000000000000000000'),
        isCreator: true,
        name: 'Tester'
      }
      const title = 'First course [via testing]'
      const mutation = `
      mutation {
        course: createCourse(courseData: {
          title: "${title}",
          cost: 3.99,
          privacy: PRIVATE,
          published: true,
          isBlog: false,
          description: "Sample description",
          isFeatured: false
        }) {
          id,
          cost,
          privacy,
          slug
        }
      }
      `

      const result = await graphql(schema, mutation, null, { user })
      expect(result).toHaveProperty('data')
      expect(result.data).toHaveProperty('course')
      expect(result.data.course).toHaveProperty('id')
      expect(result.data.course.id).not.toBeNull()
      expect(result.data.course.cost).toBe(3.99)
      expect(result.data.course.slug).toBe(slugify(title.toLowerCase()))
      expect(result.data.course.privacy).toBe(constants.closed.toUpperCase())

      createdCourseId = result.data.course.id
    })

    it('creating a blog post but description is empty', async () => {
      const user = {
        _id: mongoose.Types.ObjectId('000000000000000000000000'),
        isCreator: true,
        name: 'Tester'
      }
      const mutation = `
      mutation {
        createCourse(courseData: {
          title: "Created via [testing]",
          published: false,
          privacy: PRIVATE,
          isBlog: true,
          description: "",
          featuredImage: "",
          isFeatured: false
        }) {
          id
        }
      }
      `

      const result = await graphql(schema, mutation, null, { user })
      expect(result).toHaveProperty('errors')
      expect(result.errors[0].message).toBe(responses.blog_description_empty)
    })

    it('cost of a blog post should become zero', async () => {
      const user = {
        _id: mongoose.Types.ObjectId('000000000000000000000000'),
        isCreator: true,
        name: 'Tester'
      }
      const mutation = `
      mutation {
        course: createCourse(courseData: {
          title: "Created via [testing]",
          published: true,
          privacy: PUBLIC,
          isBlog: true,
          description: "Sample description",
          featuredImage: "",
          cost: 8.2,
          isFeatured: false
        }) {
          id,
          cost
        }
      }
      `

      const result = await graphql(schema, mutation, null, { user })
      expect(result).toHaveProperty('data')
      expect(result.data).toHaveProperty('course')
      expect(result.data.course.cost).toBe(0)

      createdCourseId3 = result.data.course.id
    })

    it('creating a course (not a blog post) but cost is not provided', async () => {
      const user = {
        _id: mongoose.Types.ObjectId('000000000000000000000000'),
        isCreator: true,
        name: 'Tester'
      }
      const mutation = `
      mutation {
        course: createCourse(courseData: {
          title: "First course [via testing]",
          privacy: PRIVATE,
          published: true,
          isBlog: false,
          description: "Sample description",
          isFeatured: false
        }) {
          id
        }
      }
      `

      const result = await graphql(schema, mutation, null, { user })
      expect(result).toHaveProperty('errors')
      expect(result.errors[0].message).toBe(responses.cost_not_provided)
    })

    it('creating a course (not a blog post) but cost is below zero', async () => {
      const user = {
        _id: mongoose.Types.ObjectId('000000000000000000000000'),
        isCreator: true,
        name: 'Tester'
      }
      const mutation = `
      mutation {
        course: createCourse(courseData: {
          title: "First course [via testing]",
          privacy: PRIVATE,
          published: true,
          isBlog: false,
          description: "Sample description",
          cost: -3,
          isFeatured: false
        }) {
          id
        }
      }
      `

      const result = await graphql(schema, mutation, null, { user })
      expect(result).toHaveProperty('errors')
      expect(result.errors[0].message).toBe(responses.invalid_cost)
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
        isCreator: true,
        name: 'Tester'
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
          isBlog: false,
          isFeatured: false
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
      const newTitle = 'edited via test by owner'
      const mutation = `
      mutation {
        updateCourse(courseData: {
          id: "${createdCourseId}",
          title: "${newTitle}",
          privacy: ${constants.open.toUpperCase()},
          isFeatured: true
        }) {
          title,
          privacy,
          isFeatured
        }
      }
      `

      const result = await graphql(schema, mutation, null, { user: { _id: userId } })
      expect(result).toHaveProperty('data')
      expect(result.data).toHaveProperty('updateCourse')
      expect(result.data.updateCourse.title).toBe(newTitle)
      expect(result.data.updateCourse.privacy).toBe(constants.open.toUpperCase())
      expect(result.data.updateCourse.isFeatured).toBeTruthy()
    })

    it('update a blog post and make its description empty', async () => {
      const userId = mongoose.Types.ObjectId('000000000000000000000000')
      const mutation = `
      mutation {
        updateCourse(courseData: {
          id: "${createdCourseId3}",
          description: ""
        }) {
          id
        }
      }
      `

      const result = await graphql(schema, mutation, null, { user: { _id: userId } })
      expect(result).toHaveProperty('errors')
      expect(result.errors[0].message).toBe(responses.blog_description_empty)
    })

    it('update a blog post and make its cost non-zero', async () => {
      const userId = mongoose.Types.ObjectId('000000000000000000000000')
      const mutation = `
      mutation {
        updateCourse(courseData: {
          id: "${createdCourseId3}",
          cost: 8.2
        }) {
          id,
          cost
        }
      }
      `

      const result = await graphql(schema, mutation, null, { user: { _id: userId } })
      expect(result).toHaveProperty('data')
      expect(result.data).toHaveProperty('updateCourse')
      expect(result.data.updateCourse.cost).toBe(0)
    })

    it('update a course and make its cost negative', async () => {
      const userId = mongoose.Types.ObjectId('000000000000000000000000')
      const mutation = `
      mutation {
        updateCourse(courseData: {
          id: "${createdCourseId}",
          cost: -4
        }) {
          id
        }
      }
      `

      const result = await graphql(schema, mutation, null, { user: { _id: userId } })
      expect(result).toHaveProperty('errors')
      expect(result.errors[0].message).toBe(responses.invalid_cost)
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

    it('getting first page of courses created by user but the offset is invalid', async () => {
      const userId = mongoose.Types.ObjectId('000000000000000000000000')
      const query = `
      query y {
        getCreatorCourses(id: "000000000000000000000000", offset: 0) {
          id, title
        }
      }
      `

      const result = await graphql(schema, query, null, { user: { _id: userId } })
      expect(result).toHaveProperty('errors')
      expect(result.errors[0].message).toBe(responses.invalid_offset)
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
      expect(result.data.getCreatorCourses.length).not.toBeLessThan(2)
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

    it('getting latest blog posts but invalid offset', async () => {
      const userId = mongoose.Types.ObjectId('000000000000000000000000')
      const query = `
      query y {
        getPosts(offset: 0) {
          title
        }
      }
      `

      const result = await graphql(schema, query, null, { user: { _id: userId } })
      expect(result).toHaveProperty('errors')
      expect(result.errors[0].message).toBe(responses.invalid_offset)
    })

    it('getting latest blog posts', async () => {
      const userId = mongoose.Types.ObjectId('000000000000000000000000')
      const query = `
      query y {
        getPosts(offset: 1) {
          title,
          description,
          slug,
          id
        }
      }
      `

      const result = await graphql(schema, query, null, { user: { _id: userId } })
      expect(result).toHaveProperty('data')
      expect(result.data).toHaveProperty('getPosts')
      expect(result.data.getPosts.length).not.toBeLessThan(1)
    })

    it('getting public courses', async () => {
      const userId = mongoose.Types.ObjectId('000000000000000000000000')
      const query = `
      query y {
        courses: getPublicCourses(offset: 1) {
          title,
          id
        }
      }
      `

      const result = await graphql(schema, query, null, { user: { _id: userId } })
      expect(result).toHaveProperty('data')
      expect(result.data).toHaveProperty('courses')
      expect(result.data.courses.length).not.toBeLessThan(1)
    })

    it('getting public featured courses', async () => {
      const userId = mongoose.Types.ObjectId('000000000000000000000000')
      const query = `
      query y {
        courses: getPublicCourses(offset: 1, onlyShowFeatured: true) {
          title,
          id
        }
      }
      `

      const result = await graphql(schema, query, null, { user: { _id: userId } })
      expect(result).toHaveProperty('data')
      expect(result.data).toHaveProperty('courses')
      expect(result.data.courses.length).not.toBeLessThan(1)
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
          id
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
          creatorId,
          contentURL
        }
      }
      `

      const result = await graphql(schema, mutation, null, { user: { _id: userID } })
      expect(result).not.toHaveProperty('errors')
      const { lesson } = result.data
      expect(lesson.creatorId).toBe(mongoId)
      expect(lesson.type).toBe('VIDEO')
      expect(lesson.title).toBe(title)
      expect(lesson.downloadable).toBe(true)
      expect(lesson.content).toBe(null)
      expect(lesson.contentURL).toBe(contentUrlString)
      createdLessonId = lesson.id
    })

    it('creating a valid (video) lesson but adding it to a blog post', async () => {
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
          courseId: "${createdCourseId3}"
        }) {
          id
        }
      }
      `

      const result = await graphql(schema, mutation, null, { user: { _id: userID } })
      expect(result).toHaveProperty('errors')
      expect(result.errors[0].message).toBe(responses.cannot_add_to_blogs)
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
  })

  /**
   * Test suite for SiteInfo.
   */
  describe('siteinfo', () => {
    it('Update site info but not authenticated', async () => {
      const mutation = `
      mutation {
        updateSiteInfo(siteData: {title: "hehe"}) {
          title
        }
      }
      `

      const result = await graphql(schema, mutation, null, {})
      expect(result).toHaveProperty('errors')
      expect(result.errors[0].message).toBe(responses.request_not_authenticated)
    })

    it('Update site info but the user is not admin', async () => {
      const mongoId = '000000000000000000000000'
      const userID = mongoose.Types.ObjectId(mongoId)
      const mutation = `
      mutation {
        updateSiteInfo(siteData: {title: "hehe"}) {
          title
        }
      }
      `

      const result = await graphql(schema, mutation, null, { user: { _id: userID, isAdmin: false } })
      expect(result).toHaveProperty('errors')
      expect(result.errors[0].message).toBe(responses.is_not_admin)
    })

    it('Update site info', async () => {
      const mongoId = '000000000000000000000000'
      const userID = mongoose.Types.ObjectId(mongoId)
      const newTitle = 'My awesome site'
      const mutation = `
      mutation {
        siteInfo: updateSiteInfo(siteData: {title: "${newTitle}"}) {
          title
        }
      }
      `

      const result = await graphql(schema, mutation, null, { user: { _id: userID, isAdmin: true } })
      expect(result).not.toHaveProperty('errors')
      expect(result.data).toHaveProperty('siteInfo')
      expect(result.data.siteInfo.title).toBe(newTitle)
    })
  })

  /**
   * Test suite for 'Media' related functions.
   */
  describe('media', () => {
    it('getting creator media with unauthenticated request', async () => {
      const query = `
      query {
        getCreatorMedia(offset: 1) {
          id,
          title,
          altText
        }
      }
      
      `

      const result = await graphql(schema, query, null, {})
      expect(result).toHaveProperty('errors')
      expect(result.errors[0].message).toBe(responses.request_not_authenticated)
    })

    it('getting creator media but invalid offset', async () => {
      const user = {
        _id: mongoose.Types.ObjectId('000000000000000000000000')
      }

      const query = `
      query {
        getCreatorMedia(offset: 0) {
          id,
          title,
          altText
        }
      }
      
      `

      const result = await graphql(schema, query, null, { user })
      expect(result).toHaveProperty('errors')
      expect(result.errors[0].message).toBe(responses.invalid_offset)
    })

    it('getting creator media', async () => {
      const user = {
        _id: mongoose.Types.ObjectId('000000000000000000000000')
      }

      const query = `
      query {
        getCreatorMedia(offset: 1) {
          id,
          title,
          altText
        }
      }
      
      `

      const result = await graphql(schema, query, null, { user })
      expect(result).toHaveProperty('data')
      expect(result.data).toHaveProperty('getCreatorMedia')
      expect(result.data.getCreatorMedia.length).toBe(0)
    })

    it('search creator media', async () => {
      const user = {
        _id: mongoose.Types.ObjectId('000000000000000000000000')
      }

      const query = `
      query {
        getCreatorMedia(offset: 1, searchText: "test") {
          id,
          title,
          altText
        }
      }
      
      `

      const result = await graphql(schema, query, null, { user })
      expect(result).toHaveProperty('data')
      expect(result.data).toHaveProperty('getCreatorMedia')
      expect(result.data.getCreatorMedia.length).toBe(0)
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
