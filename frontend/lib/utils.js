import fetch from 'isomorphic-unfetch'

/**
 * A wrapper for querying the GraphQL endpoint.
 *
 * @param {string} url
 * @param {string} query
 * @param {string} token an authorization token, skip for unauthenticated requests
 */
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
  async (query, cb) => {
    try {
      dispatch(networkAction(false))
      let response = await queryGraphQL(
        `${backend}/graph`,
        query,
        token)

      cb(response)
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
