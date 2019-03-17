/**
 * This component provides a clickable button which shows if the user
 * is logged in or is a guest.
 */

import React from 'react'
import PropTypes from 'prop-types'
import Link from 'next/link'
import { connect } from 'react-redux'

SessionButton.propTypes = {
  auth: PropTypes.shape({
    guest: PropTypes.bool,
    token: PropTypes.string
  })
}

function SessionButton (props) {
  const button = props.auth.guest
    ? (
      <Link href='/login'>
        <a>Login</a>
      </Link>
    ) : (
      <Link href='/logout'>
        <a>Logout</a>
      </Link>
    )

  return (
    <div>
      {button}
    </div>
  )
}

const mapStateToProps = state => ({
  auth: state.auth
})

export default connect(
  mapStateToProps
)(SessionButton)
