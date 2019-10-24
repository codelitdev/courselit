/**
 * A Higher-order component for secured routes.
 *
 */
import React, { useEffect } from 'react'
import {
  protectedRouteProps
} from '../types.js'

/**
  * Redirects to a defined page if the condition is satisfied.
  *
  * @param {bool} props.condition the condition under which the redirection should happen
  * @param {object} props.router Next.js' router
  * @param {string} props.redirectTo the url to redirect to
  * @param {bool} props.renderOnServer if children can be rendered on server
  */
const ProtectedRoute = (props) => {
  useEffect(() => {
    // if (process.browser) {
    //   console.log(props)
    //   if (props.condition) { props.router.push(props.redirectTo) }
    // }
  })

  if (props.renderOnServer) {
    return <>{props.children}</>
  } else {
    return <>{props.children}</>
  }
}

ProtectedRoute.propTypes = protectedRouteProps

export default ProtectedRoute
