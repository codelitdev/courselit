"use strict";

/**
 * An endpoint for managing payments
 */
const express = require("express");
const responses = require("../config/strings.js").responses;
const Course = require("../models/Course.js");
const User = require("../models/User.js");
const SiteInfo = require("../models/SiteInfo.js");
const Payment = require("../payments");
const Purchase = require("../models/Purchase.js");
const {
  transactionSuccess,
  transactionInitiated,
  transactionFailed,
} = require("../config/constants.js");

const initiateHandler = async (req, res) => {
  const { user, body } = req;
  const { courseid, metadata, purchasingfor } = body;

  if (!courseid) {
    return res.status(400).json({ error: responses.invalid_course_id });
  }

  try {
    const course = await Course.findById(courseid);
    if (!course) {
      return res.status(404).json({ error: responses.item_not_found });
    }

    let buyer = user;
    if (purchasingfor) {
      if (!user.isAdmin) {
        return res
          .status(400)
          .json({ error: responses.only_admins_can_purchase });
      }

      buyer = await user.findById(purchasingfor);
      if (!buyer) {
        return res.status(404).json({ error: responses.item_not_found });
      }
    }

    if (buyer.purchases.includes(course.id)) {
      return res.status(200).json({
        status: transactionSuccess,
      });
    }

    // TODO: implement the validation for discount coupons

    if (course.cost === 0) {
      try {
        await finalizeCoursePurchase(user.id, course.id);
        return res.status(200).json({
          status: transactionSuccess,
        });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }

    const siteinfo = (await SiteInfo.find())[0];
    const paymentMethod = await Payment.getPaymentMethod(
      siteinfo && siteinfo.paymentMethod
    );

    const purchase = await Purchase.create({
      courseId: course.id,
      purchasedOn: new Date(),
      purchasedBy: user.id,
      paymentMethod: siteinfo.paymentMethod,
      amount: course.cost * 100,
      currencyISOCode: siteinfo.currencyISOCode,
    });

    const paymentTracker = await paymentMethod.initiate({
      course,
      currency: siteinfo.currencyISOCode,
      metadata: JSON.parse(metadata),
      purchaseId: purchase.id,
    });

    purchase.paymentId = paymentTracker;
    await purchase.save();

    res.status(200).json({
      status: transactionInitiated,
      paymentTracker,
    });
  } catch (err) {
    res.status(500).json({
      status: transactionFailed,
      error: err.message,
    });
  }
};

const finalizeCoursePurchase = async (userId, courseId) => {
  const user = await User.findById(userId);
  const course = await Course.findById(courseId);

  if (user && course) {
    user.purchases.push(course.id);
    await user.save();
  }
};

const verifyHandler = async (req, res) => {
  const { user } = req;
  const { purchaseid } = req.body;

  if (!purchaseid) {
    return res.status(400).json({ message: responses.invalid_input });
  }

  try {
    const purchaseRecord = await Purchase.findById(purchaseid);

    if (
      !purchaseRecord ||
      !adminOrSelf({ loggedInUser: user, buyerId: purchaseRecord.purchasedBy })
    ) {
      return res.status(404).json({ message: responses.item_not_found });
    }

    res.status(200).json({
      status: purchaseRecord.status,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

const adminOrSelf = ({ loggedInUser, buyerId }) =>
  loggedInUser.id === buyerId.toString() || loggedInUser.isAdmin;

const webhookHandler = async (req, res) => {
  const { body } = req;
  const siteinfo = (await SiteInfo.find())[0];
  const paymentMethod = await Payment.getPaymentMethod(siteinfo.paymentMethod);

  const paymentVerified = paymentMethod.verify(body);

  if (paymentVerified) {
    const purchaseRecord = await Purchase.findById(
      paymentMethod.getPaymentIdentifier(body)
    );

    if (purchaseRecord) {
      purchaseRecord.status = transactionSuccess;
      await purchaseRecord.save();

      await finalizeCoursePurchase(
        purchaseRecord.purchasedBy,
        purchaseRecord.courseId
      );

      res.status(200).json({
        message: "success",
      });
    } else {
      res.status(200).json({
        message: "fail",
      });
    }
  } else {
    res.status(200).json({
      message: "fail",
    });
  }
};

module.exports = (passport) => {
  const router = express.Router();
  router.post(
    "/initiate",
    passport.authenticate("jwt", { session: false }),
    initiateHandler
  );
  router.post(
    "/verify",
    passport.authenticate("jwt", { session: false }),
    verifyHandler
  );
  router.post("/webhook", webhookHandler);
  return router;
};
