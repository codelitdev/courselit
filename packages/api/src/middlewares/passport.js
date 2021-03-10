"use strict";

/**
 * Configuration for PassportJS authentication via JWT
 */

// The code is taken from https://www.npmjs.com/package/passport-jwt
const JwtStrategy = require("passport-jwt").Strategy;
const LocalStrategy = require("passport-local").Strategy;
const extractJwt = require("passport-jwt").ExtractJwt;
const constants = require("../config/constants.js");
const responses = require("../config/strings.js").responses;
const User = require("../models/User.js");

module.exports = (passport) => {
  passport.use(
    "signup",
    new LocalStrategy(
      {
        usernameField: "email",
        passReqToCallback: true,
      },
      async (req, email, password, next) => {
        // validate input
        if (!req.body.name) {
          // Refer https://github.com/jaredhanson/passport-local/issues/4#issuecomment-4521526
          // for this syntax.
          return next(null, false, { message: responses.name_required });
        }

        try {
          let user = await User.findOne({ email, domain: req.domain._id });
          if (user) {
            return next(null, false, {
              message: responses.email_already_registered,
            });
          }

          const notTheFirstUserOfDomain = await User.countDocuments({
            domain: req.domain._id,
          });
          user = await User.create({
            domain: req.domain._id,
            email,
            password,
            name: req.body.name,
            isCreator: !notTheFirstUserOfDomain,
            isAdmin: !notTheFirstUserOfDomain,
            active: true,
          });
          return next(null, user);
        } catch (err) {
          return next(err, false);
        }
      }
    )
  );

  passport.use(
    "login",
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
        passReqToCallback: true,
      },
      async (req, email, password, next) => {
        try {
          const user = await User.findOne({ email, domain: req.domain._id });

          if (!user) {
            return next(null, false, {
              message: responses.auth_user_not_found,
            });
          }

          const validate = await user.isPasswordValid(password);

          if (!validate) {
            return next(null, false, {
              message: responses.email_or_passwd_invalid,
            });
          }

          return next(null, user);
        } catch (err) {
          return next(err, false);
        }
      }
    )
  );

  const jwtStrategyOptions = {
    jwtFromRequest: extractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: constants.jwtSecret,
    jsonWebTokenOptions: {
      expiresIn: constants.jwtExpire,
    },
    passReqToCallback: true,
  };

  passport.use(
    new JwtStrategy(jwtStrategyOptions, function (req, jwtToken, done) {
      const { email, domain } = jwtToken;

      if (domain !== req.domain._id.toString()) {
        return done(null, false);
      }

      User.findOne({ email, domain }, function (err, user) {
        if (err) {
          return done(err, false);
        }

        if (user) {
          return done(null, user);
        } else {
          return done(null, false);
        }
      });
    })
  );
};
