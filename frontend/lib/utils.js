/**
 * Next.js Utility functions.
 */

/**
  * Redirects to a defined page if condition is satisfied.
  *
  * @param {Object} auth the auth object from redux store
  * @param {Object} router Next.js' router
  * @param {String} path the url to redirect to
  */
export function redirector (auth, router, path) {
  if (!auth.guest) { router.push(path) }
} 

