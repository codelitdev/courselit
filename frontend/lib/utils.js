/**
 * Next.js Utility functions.
 */
import fetch from 'isomorphic-unfetch'
import { encode, decode } from 'base-64'

/**
 * A wrapper for querying the GraphQL endpoint.
 *
 * @param {string} url
 * @param {string} query
 * @param {string} token an authorization token, skip for unauthenticated requests
 */
export const queryGraphQL = async (url, query, token) => {
  try {
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
  } catch (err) {
    throw err
  }
}

/**
 * A helper function to capitalize the first letter of any string.
 *
 * @param {string} s
 */
export const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * A helper function to retrive data from a graphql endpoint along with
 * several UI niceties.
 *
 * @param {string} backend A url representing backend end-point
 * @param {function} dispatch Redux's dispatcher
 * @param {function} networkAction An action creator for showing network transit
 * @param {string} token an authorization token
 * @param {string} query A graphql query
 * @param {function} cb A callback function
 */
export const getDataCreator = (backend, dispatch, networkAction, token) =>
  async (query, cb) => {
    try {
      dispatch(networkAction(false))
      let response = await queryGraphQL(
        `${backend}/graph`,
        query,
        token)

      cb(response)
    } catch (err) {
      // do nothing
    } finally {
      dispatch(networkAction(false))
    }
  }

export const draftJsStringify = {
  encode: (stringToBeEncoded) => {
    return encode(JSON.stringify(stringToBeEncoded))
  },
  decode: (fromEncodedString) => {
    return JSON.parse(decode(fromEncodedString))
  }
}
