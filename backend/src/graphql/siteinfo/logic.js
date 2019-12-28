/**
 * Business logic for managing site information.
 */
const SiteInfo = require('../../models/SiteInfo.js')
const {
  checkIfAuthenticated
} = require('../../lib/graphql.js')
const {
  responses
} = require('../../config/strings.js')
const {
  currencyISOCodes
} = require('../../config/constants.js')

exports.getSiteInfo = async () => {
  const siteinfo = await SiteInfo.find()
  return siteinfo[0]
}

exports.updateSiteInfo = async (siteData, ctx) => {
  checkIfAuthenticated(ctx)

  // check if the user is an admin
  if (!ctx.user.isAdmin) throw new Error(responses.is_not_admin)

  if (siteData.currencyISOCode && !~currencyISOCodes.indexOf(siteData.currencyISOCode)) {
    throw new Error(responses.unrecognised_currency_code)
  }

  let siteInfo = await SiteInfo.find()
  siteInfo = siteInfo[0]

  // create a new entry if not existing
  let shouldCreate = false
  if (siteInfo === undefined) {
    shouldCreate = true
    siteInfo = {}
  }

  // populate changed data
  for (const key of Object.keys(siteData)) {
    siteInfo[key] = siteData[key]
  }

  if (shouldCreate) {
    siteInfo = await SiteInfo.create(siteInfo)
  } else {
    siteInfo = await siteInfo.save()
  }

  return siteInfo
}
