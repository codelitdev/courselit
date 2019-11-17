import fetch from 'isomorphic-unfetch'

export const queryGraphQL = async (url, query, token) => {
  let response = await fetch(url, {
    method: 'POST',
    headers: token ? {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    } : { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: query })
  })
  response = await response.json()

  if (response.errors && response.errors.length > 0) {
    throw new Error(response.errors[0].message)
  }

  return response.data
}

export const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)

export const queryGraphQLWithUIEffects = (backend, dispatch, networkAction, token) =>
  async (query) => {
    try {
      dispatch(networkAction(false))
      let response = await queryGraphQL(
        `${backend}/graph`,
        query,
        token)

      return response
    } catch (err) {
      throw err
    } finally {
      dispatch(networkAction(false))
    }
  }

export const formattedLocaleDate = (epochString) =>
  (new Date(Number(epochString))).toLocaleString('en-US')

export const removeEmptyProperties = (obj, propToExclude) =>
  Object
    .keys(obj)
    .filter(i => i !== propToExclude)
    .reduce(
      (acc, item, index) => {
        if (obj[item] !== '') {
          acc[item] = obj[item]
        }
        return acc
      }, {})

// Regex copied from: https://stackoverflow.com/a/48675160/942589
export const makeGraphQLQueryStringFromJSObject = obj =>
  JSON.stringify(obj).replace(/"([^(")"]+)":/g, '$1:')

export const formulateMediaUrl =
  (backend, mediaID, generateThumbnailUrl = false) =>
    `${backend}/media/${mediaID}${generateThumbnailUrl ? '?thumb=1' : ''}`
