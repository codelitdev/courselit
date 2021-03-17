/**
 * This route handles domain related functionality.
 */
const express = require("express");
const Domain = require("../models/Domain.js");

const router = express.Router();

router.get("/verify", async (req, res) => {
  const { domain } = req.query;

  const domainObj = await Domain.findOne({ customDomain: domain });

  if (domainObj) {
    res.status(200).json({ message: "Success" });
  } else {
    res.status(404).json({ message: "Error" });
  }
});

module.exports = router;
