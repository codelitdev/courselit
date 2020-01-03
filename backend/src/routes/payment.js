/**
 * An endpoint for managing payments
 */
const express = require('express')
const responses = require('../config/strings').responses
const Course = require('../models/Course.js')
const SiteInfo = require('../models/SiteInfo.js')
const Settings = require('../models/Settings.js')
const Payment = require('../payments')

const initiateHandler = async (req, res) => {
  const { user, body } = req
  const { courseid, discountcode, purchasingfor } = body

  if (!courseid) {
    return res.status(400).json({message: responses.invalid_course_id})
  }

  try {
    const course = await Course.findById(courseid)
    if (!course) {
      return res.status(404).json({message: responses.item_not_found})
    }

    let buyer = user
    if (purchasingfor) {
      if (!user.isAdmin) {
        return res.status(400).json({message: responses.only_admins_can_purchase})
      }

      buyer = await user.findById(purchasingfor)
      if (!buyer) {
        return res.status(404).json({message: responses.item_not_found})
      }
    }
    
    if (buyer.purchases.includes(course.id)) {
      return res.status(400).json({message: responses.course_already_purchased})
    }

    const siteinfo = (await SiteInfo.find())[0]
    const settings = (await Settings.find())[0]

    // TODO: implement the validation for discount coupons

    if (course.cost === 0) {
      try {
        res.status(200).json(await finalizeCoursePurchase(user, course))
      } catch (err) {
        res.status(500).json({error: err.message})
      }
    }

    const paymentMethod = Payment.getPaymentMethod(settings.paymentMethod)
    const paymentTracker =
      await paymentMethod.initiate(course.cost * 100, siteinfo.currencyISOCode)

    res.status(200).json({
      message: 'success',
      paymentTracker
    })
  } catch (err) {
    res.status(500).json({message: err.message})
  }
}

const finalizeCoursePurchase = async (buyer, course) => {
  return {
    status: 'success'
  }
}

const finalizeHandler = async (req, res) => {}

module.exports = (passport) => {
  const router = express.Router()
  router.post('/initiate',
    passport.authenticate('jwt', { session: false }), initiateHandler)
  router.post('/finalize',
    passport.authenticate('jwt', { session: false }), finalizeHandler)
  return router
}