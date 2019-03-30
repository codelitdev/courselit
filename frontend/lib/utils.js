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
    return response.data
  } catch (err) {
    throw err
  }
}
