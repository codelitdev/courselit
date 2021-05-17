/**
 * This route handles everything related to signing users in.
 */

const express = require("express");
const jwt = require("jsonwebtoken");
const constants = require("../config/constants.js");

module.exports = (passport) => {
  const router = express.Router();

  router.post(
    "/magiclink",
    passport.authenticate("magiclink", { action: "requestToken" }),
    (req, res) => {
      res.status(200).json({ message: "Success" });
    }
  );

  router.get(
    "/magiclink/callback",
    passport.authenticate("magiclink", {
      action: "acceptToken",
      session: false,
    }),
    (req, res) => {
      const token = jwt.sign(
        { email: req.user.email, domain: req.subdomain._id },
        constants.jwtSecret,
        { expiresIn: constants.jwtExpire }
      );

      return res.status(200).json({ token, email: req.user.email });
    }
  );

  return router;
};
