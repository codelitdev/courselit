/**
 * @jest-environment node
 */

/**
  * This is a test suite containing unit tests for the GraphQL API.
  */
const graphql = require('graphql').graphql
const schema = require('../../src/graphql/schema.js')
const User = require('../../src/models/User.js')
const responses = require('../../src/config/strings.js').responses
require('../../src/config/db.js')
const mongoose = require('mongoose')

describe('GraphQL API tests', () => {
  const user = 'graphuser@test.com'
  const user2 = 'graphuser2@test.com'

  afterAll(done => {
    User.deleteMany({ email: { $in: [user, user2] } }, () => {
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
   * Test suite for 'Lesson' related functions.
   */
  describe('lessons', () => {
    it('creating a lesson via unauthenticate request', async () => {
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
  })
})
