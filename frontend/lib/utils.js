/**
 * Next.js Utility functions.
 */
import fetch from 'isomorphic-unfetch'

/**
 * A wrapper for querying the GraphQL endpoint.
 *
 * @param {string} url
 * @param {string} query
 * @param {string} token an authorization token
 */
export const queryGraphQL = async (url, query, token) => {
  try {
    let response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
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
