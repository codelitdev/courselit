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
const responses = require('../../src/config/strings.js').responses
require('../../src/config/db.js')
const mongoose = require('mongoose')
const slugify = require('slugify')

describe('GraphQL API tests', () => {
  const user = 'graphuser@test.com'
  const user2 = 'graphuser2@test.com'
  let createdLessonId = ''

  afterAll(done => {
    User.deleteMany({ email: { $in: [user, user2] } })
      .then(() => Lesson.findOneAndDelete({ _id: mongoose.Types.ObjectId(createdLessonId) }))
      .then(() => {
        mongoose.connection.close()
        done()
      })
    // User.deleteMany({ email: { $in: [user, user2] } }, () => {
    //   mongoose.connection.close()
    //   done()
    // })
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
   * Test suite for 'Lesson' related functions.
   */
  describe('lessons', () => {
    it('creating a lesson via unauthenticated request', async () => {
      const mutation = `
      mutation {
        createLesson(lessonData: {
          type: TEXT,
          title: "first post",
          content: "THis is so awesome"
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
          type: TEXT
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
          type: VIDEO
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
          type: AUDIO
        }) {
          title
        }
      }
      `

      const result = await graphql(schema, mutation, null, { user: { email: user } })
      expect(result).toHaveProperty('errors')
      expect(result.errors[0].message).toBe(responses.content_url_cannot_be_null)
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
          downloadable: true
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
      expect(result.errors[0].message).toBe(responses.lesson_not_found)
    })

    it('delete an existent lesson', async () => {
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
          downloadable: true
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
      expect(deleteResult.errors[0].message).toBe(responses.lesson_not_found)
      createdLessonId = lesson.id
    })

    it('Change title', async () => {
      const mongoId = '000000000000000000000000'
      const userID = mongoose.Types.ObjectId(mongoId)
      const newTitle = "morphed"
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
      const newContent = "changed content"
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
      const newContentURL = "http://fakyfaky"
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

    it('Change downloadable status', async () => {
      const mongoId = '000000000000000000000000'
      const userID = mongoose.Types.ObjectId(mongoId)
      // make it true
      let flag = true
      let mutation = `
      mutation  {
        changeDownloadable(id: "${createdLessonId}", flag: ${flag}) {
          downloadable
        }
      }`
      let result = await graphql(schema, mutation, null, { user: { _id: userID } })
      expect(result).not.toHaveProperty('errors')
      expect(result.data.changeDownloadable.downloadable).toBeTruthy()
   
      // make it false
      flag = false
      mutation = `
      mutation  {
        changeDownloadable(id: "${createdLessonId}", flag: ${flag}) {
          downloadable
        }
      }`
      result = await graphql(schema, mutation, null, { user: { _id: userID } })
      expect(result).not.toHaveProperty('errors')
      expect(result.data.changeDownloadable.downloadable).toBeFalsy()
    })
  })
})
