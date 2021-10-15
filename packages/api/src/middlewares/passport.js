"use strict";

/**
 * Configuration for PassportJS authentication via JWT
 */

// The code is taken from https://www.npmjs.com/package/passport-jwt
const JwtStrategy = require("passport-jwt").Strategy;
const MagicLinkStrategy = require("passport-magic-link").Strategy;
const extractJwt = require("passport-jwt").ExtractJwt;
const constants = require("../config/constants.js");
const responses = require("../config/strings.js").responses;
const User = require("../models/User.js");
const { send } = require("../lib/mailer.js");
const { generateMagicLink } = require("../lib/utils.js");
const pug = require("pug");
const path = require("path");

const { permissions } = constants;

module.exports = (passport) => {
  passport.use(
    new MagicLinkStrategy(
      {
        secret: constants.jwtSecret,
        userFields: ["email"],
        tokenField: "token",
        passReqToCallbacks: true,
      },
      async (req, user, token) => {
        const magiclink = generateMagicLink({
          token,
          hostname: req.hostname,
          loginPath: constants.frontendLoginPath,
          secure: req.secure,
          redirect: req.body.redirect,
        });
        const signInTemplate = path.resolve(
          __dirname,
          "../templates/signin.pug"
        );
        const emailBody = pug.renderFile(signInTemplate, { magiclink });
        return await send({
          to: user.email,
          subject: `${responses.sign_in_mail_prefix} ${req.hostname}`,
          body: emailBody,
        });
      },
      async (req, user) => {
        let dbUser = await User.findOne({
          email: user.email,
          domain: req.subdomain._id,
        });

        if (!dbUser) {
          const newUser = {
            domain: req.subdomain._id,
            email: user.email,
            active: true,
          };
          const notTheFirstUserOfDomain = await User.countDocuments({
            domain: req.subdomain._id,
          });
          if (notTheFirstUserOfDomain) {
            newUser.permissions = [permissions.enrollInCourse];
          } else {
            newUser.permissions = [
              permissions.manageCourse,
              permissions.manageAnyCourse,
              permissions.publishCourse,
              permissions.manageMedia,
              permissions.manageAnyMedia,
              permissions.uploadMedia,
              permissions.viewAnyMedia,
              permissions.manageLayout,
              permissions.manageThemes,
              permissions.manageMenus,
              permissions.manageWidgets,
              permissions.manageSettings,
              permissions.manageUsers,
            ];
          }
          dbUser = await User.create(newUser);
        }

        return dbUser.active ? dbUser : null;
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

      if (domain !== req.subdomain._id.toString()) {
        return done(null, false);
      }

      User.findOne({ email, domain, active: true }, function (err, user) {
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
