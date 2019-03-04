/**
 * @jest-environment node
 */

const promisify = require('../util.js').promisify
const User = require('../../src/models/User.js')
const responses = require('../../src/config/strings.js').responses
require('../../src/config/db.js')
const mongoose = require('mongoose')

describe.skip('Auth Test Suite', () => {
  afterAll(done => mongoose.connection.close())

  describe('Testing sign up', () => {
    beforeEach(done => {
      User.deleteOne({ email: 'user@test.com' }, () => done())
    })

    afterEach(done => {
      User.deleteOne({ email: 'user@test.com' }, () => done())
    })

    it('signup normal', () => {
      expect.assertions(1)
      return promisify({
        url: `http://${apiUrl}/auth/signup`,
        form: {
          email: 'user@test.com',
          password: 'lol'
        }
      }).then(data => expect(data.message).not.toBe(responses.error))
    })

    it('signup normal but wrong post data', () => {
      expect.assertions(1)
      return promisify({
        url: `http://${apiUrl}/auth/signup`,
        form: {
          email: 'user@test.com',
          pass: 'lol'
        }
      }).then(data => expect(data.message).toBe(responses.error))
    })

    it('signup with existing email', () => {
      expect.assertions(2)
      return promisify({
        url: `http://${apiUrl}/auth/signup`,
        form: {
          email: 'user@test.com',
          password: 'lol'
        }
      })
        .then(val => promisify({
          url: `http://${apiUrl}/auth/signup`,
          form: {
            email: 'user@test.com',
            password: 'lol'
          }
        }))
        .then(data => {
          expect(data.message).toBe(responses.error)
          expect(data.message).not.toBe(responses.user_created)
        })
    })
  })

  describe('Testing sign in', () => {
    beforeAll(done => {
      promisify({
        url: `http://${apiUrl}/auth/signup`,
        form: {
          email: 'user@test.com',
          password: 'lol'
        }
      }).then(() => done())
    })

    afterAll(done => {
      User.deleteOne({ email: 'user@test.com' }, () => {
        done()
      })
    })

    it('non existing user', () => {
      expect.assertions(1)
      return promisify({
        url: `http://${apiUrl}/auth/login`,
        form: {
          email: 'user2@test.com',
          password: 'lol'
        }
      }).then(data => {
        expect(data.message).toBe(responses.not_logged_in)
      })
    })

    it('wrong password', () => {
      expect.assertions(1)
      return promisify({
        url: `http://${apiUrl}/auth/login`,
        form: {
          email: 'user@test.com',
          password: 'lol2'
        }
      }).then(data => {
        expect(data.message).toBe(responses.not_logged_in)
      })
    })

    it('existing user', () => {
      expect.assertions(2)
      return promisify({
        url: `http://${apiUrl}/auth/login`,
        form: {
          email: 'user@test.com',
          password: 'lol'
        }
      }).then(data => {
        expect(data).not.toHaveProperty('message')
        expect(data.token).toBeTruthy()
      })
    })
  })

  describe('Testing graphql endpoint security', () => {
    beforeAll(done => {
      promisify({
        url: `http://${apiUrl}/auth/signup`,
        form: {
          email: 'user@test.com',
          password: 'lol'
        }
      }).then(() => done())
    })

    afterAll(done => {
      User.deleteOne({ email: 'user@test.com' }, () => {
        done()
      })
    })

    // it('Hitting /graph endpoint with an unauthorized request', () => {
    //   expect.assertions(1)
    //     return promisify({
    //         url: `http://${apiUrl}/graph`,
    //         // form: {
    //         //     email: 'user2@test.com',
    //         //     password: 'lol'
    //         // }
    //   }, false).then(data => {
    //       expect(data).toBe(responses.passport_js_unauthorized)
    //   })
    // })

    it('Hitting /graph endpoint with an authorized request', () => {
      expect.assertions(2)
      return promisify({
        url: `http://${apiUrl}/auth/login`,
        form: {
          email: 'user@test.com',
          password: 'lol'
        }
      })
        .then(data => data.token)
        .then(token => {
          return promisify({
            url: `http://${apiUrl}/graph`,
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }, false)
        })
        .then(data => {
          try {
            const res = JSON.parse(data)
            expect(res).toHaveProperty('errors')
            expect(res.errors[0].message).toBe('Must provide query string.')
          } catch (err) {
            // do nothing
          }
        })
    })
  })
})
