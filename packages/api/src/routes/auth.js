/**
 * This route handles everything related to signing users in.
 */

const express = require("express");
const jwt = require("jsonwebtoken");
const constants = require("../config/constants.js");
const responses = require("../config/strings.js").responses;

module.exports = (passport) => {
  const router = express.Router();

  router.post("/signup", (req, res, next) => {
    passport.authenticate("signup", (err, user, info) => {
      if (err) return res.status(500).json({ message: err.message });
      if (info) return res.status(400).json({ message: info.message });
      // if (err || !user) { return res.status(400).json({ message: responses.error }) }

      return res.status(200).json({ message: responses.user_created });
    })(req, res, next);
  });

  router.post("/login", (req, res, next) => {
    passport.authenticate("login", (err, user, info) => {
      try {
        if (err) return res.status(500).json({ message: err.message });
        if (info) return res.status(400).json({ message: info.message });

        req.login(user, { session: false }, (err) => {
          if (err) {
            return res
              .status(500)
              .json({ message: responses.error, details: err.message });
          }

          const token = jwt.sign(
            { email: user.email, domain: req.domain._id },
            constants.jwtSecret,
            {
              expiresIn: constants.jwtExpire,
            }
          );

          return res.json({ token });
        });
      } catch (err) {
        return res
          .status(500)
          .json({ message: responses.error, details: err.message });
      }
    })(req, res, next);
  });

  return router;
};
