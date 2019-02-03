/**
 * This route handles everything related to signing users in.
 */

const express = require('express')
const responses = require('../config/strings.js').responses

module.exports = (passport) => {
  const router = express.Router()

  router.post(
    '/signup',
    (req, res, next) => {
      passport.authenticate('signup', (err, user, info) => {
        if (err)
          return res.status(400).json({message: 'Error'})

        return res.status(200).json({message: responses.user_created})
      })(req, res, next)
    }
  )

  router.post(
    '/login',
    passport.authenticate('jwt', { session: false }),
    function (req, res) {
      res.send(req.user)
    }
  )

  return router
}
