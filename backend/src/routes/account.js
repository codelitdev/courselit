/**
 * This file handles user's profile
 */

const express = require('express')
const User = require('../models/User.js')

module.exports = () => {
  const router = express.Router()

  router.get(
    '/',
    (req, res, next) => {
      res.send(JSON.stringify({ user: req.user }))
    }
  )

  return router
}
