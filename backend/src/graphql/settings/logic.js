const Settings = require('../../models/Settings.js')
const SiteInfo = require('../../models/SiteInfo.js')
const { checkIfAuthenticated } = require('../../lib/graphql.js')
const { responses } = require('../../config/strings.js')
const { capitalize } = require('../../lib/utils.js')
const {
  paypal,
  stripe,
  paytm
} = require('../../config/constants.js')

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

const validatePaymentMethodOrThrow = async (settings) => {
  const siteInfo = (await SiteInfo.find())[0]

  let failedPaymentMethod = null

  if (siteInfo.paymentMethod === paytm && !settings.paytmSecret) {
    failedPaymentMethod = paytm
  }

  if (siteInfo.paymentMethod === paypal && !settings.paypalSecret) {
    failedPaymentMethod = paypal
  }

  if (siteInfo.paymentMethod === stripe && !settings.stripeSecret) {
    failedPaymentMethod = stripe
  }

  if (failedPaymentMethod) {
    throw getPaymentInvalidException(failedPaymentMethod)
  }
}

const getPaymentInvalidException = (paymentMethod) =>
  new Error(`${capitalize(paymentMethod)} ${responses.payment_settings_invalid_suffix}`)
