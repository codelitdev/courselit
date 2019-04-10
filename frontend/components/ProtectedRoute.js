/**
 * A Higher-order component for secured routes.
 *
 */
import React from 'react'
import PropTypes from 'prop-types'

/**
  * Redirects to a defined page if the condition is satisfied.
  *
  * @param {bool} props.condition the condition under which the redirection should happen
  * @param {object} props.router Next.js' router
  * @param {string} props.redirectTo the url to redirect to
  * @param {bool} props.renderOnServer if children can be rendered on server
  */
const ProtectedRoute = (props) => {
  // Redirection happens only on the client side.
  if (process.browser) {
    if (props.condition) { props.router.push(props.redirectTo) }
  }

  if (props.renderOnServer) {
    return <>{props.children}</>
  } else {
    return <></>
  }
}

ProtectedRoute.propTypes = {
  condition: PropTypes.bool.isRequired,
  router: PropTypes.object.isRequired,
  redirectTo: PropTypes.string.isRequired,
  renderOnServer: PropTypes.bool.isRequired,
  children: PropTypes.object
}

export default ProtectedRoute
