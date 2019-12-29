const Settings = require('../../models/Settings.js')
const {
  checkIfAuthenticated
} = require('../../lib/graphql.js')
const {
  responses
} = require('../../config/strings.js')
const {
  paypal,
  stripe,
  paytm
} = require('../../config/constants.js')
const {
  capitalize
} = require('../../lib/utils.js')

exports.getSettings = async (ctx) => {
  checkIfAuthenticated(ctx)

  if (!ctx.user.isAdmin) {
    throw new Error(responses.is_not_admin)
  }

  const settings = await Settings.find()
  return settings[0]
}

exports.updateSettings = async (settingsData, ctx) => {
  checkIfAuthenticated(ctx)

  if (!ctx.user.isAdmin) {
    throw new Error(responses.is_not_admin)
  }

  let settings = await Settings.find()
  settings = settings[0]

  // create a new entry if not existing
  let shouldCreate = false
  if (settings === undefined) {
    shouldCreate = true
    settings = {}
  }

  // populate changed data
  for (const key of Object.keys(settingsData)) {
    settings[key] = settingsData[key]
  }

  // validate payment combinations
  validatePaymentMethodOrThrow(settings)

  if (shouldCreate) {
    settings = await Settings.create(settings)
  } else {
    settings = await settings.save()
  }

  return settings
}

const validatePaymentMethodOrThrow = (settings) => {
  let failedPaymentMethod = null

  if (settings.paymentMethod === paytm && !settings.paytmSecret) {
    failedPaymentMethod = paytm
  }

  if (settings.paymentMethod === paypal && !settings.paypalSecret) {
    failedPaymentMethod = paypal
  }

  if (settings.paymentMethod === stripe && !settings.stripeSecret) {
    failedPaymentMethod = stripe
  }

  if (failedPaymentMethod) {
    throw getPaymentInvalidException(failedPaymentMethod)
  }
}

const getPaymentInvalidException = (paymentMethod) =>
  new Error(`${capitalize(paymentMethod)} ${responses.payment_settings_invalid_suffix}`)
