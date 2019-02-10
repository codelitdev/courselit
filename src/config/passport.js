/**
 * Configuration for PassportJS authentication via JWT
 */

// The code is taken from https://www.npmjs.com/package/passport-jwt
const JwtStrategy = require('passport-jwt').Strategy
const LocalStrategy = require('passport-local').Strategy
const extractJwt = require('passport-jwt').ExtractJwt
const constants = require('./constants.js')
const User = require('../models/User.js')

module.exports = (passport) => {
  const opts = {
    jwtFromRequest: extractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: constants.authSecret,
    issuer: constants.authIssuer,
    audience: constants.authIssuer
  }

  // For sign up
  passport.use('signup', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
  }, async (req, email, password, next) => {
    try {
      const user = await User.create({ email, password })
      return next(null, user)
    } catch (err) {
      return next(err, false)
    }
  }))

  // For sing in
  passport.use('login', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
  }, async (req, email, password, next) => {
    try {
      const user = await User.findOne({ email })

      if (!user) {
        return next(null, false)
      }
        
      const validate = await user.isPasswordValid(password)

      if (!validate) {
        return next(null, false)
      }
        
      return next(null, user)
    } catch (err) {
      return next(err, false)
    }
  }))

  // For verifying JWT
  passport.use(new JwtStrategy(opts, function (jwtPayload, done) {
    User.findOne({ email: jwtPayload.sub }, function (err, user) {
      if (err) {
        return done(err, false)
      }
      if (user) {
        return done(null, user)
      } else {
        return done(null, false)
      }
    })
  }))
}
