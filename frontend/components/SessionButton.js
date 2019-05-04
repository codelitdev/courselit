/**
 * This component provides a clickable button which shows if the user
 * is logged in or is a guest.
 */

import React from 'react'
import Link from 'next/link'
import { connect } from 'react-redux'
import {
  CREATOR_AREA_LINK_TEXT,
  GENERIC_SIGNOUT_TEXT,
  GENERIC_SIGNIN_TEXT
} from '../config/strings.js'
import {
  authProps,
  profileProps
} from '../types.js'

SessionButton.propTypes = {
  auth: authProps,
  profile: profileProps
}

function SessionButton (props) {
  const button = props.auth.guest
    ? (
      <Link href='/login'>
        <a>{ GENERIC_SIGNIN_TEXT }</a>
      </Link>
    ) : (
      <Link href='/logout'>
        <a>{ GENERIC_SIGNOUT_TEXT }</a>
      </Link>
    )

  return (
    <div>
      {button}
      {props.profile.isCreator &&
        <Link href='/create'>
          <a>{CREATOR_AREA_LINK_TEXT}</a>
        </Link>}
    </div>
  )
}

const mapStateToProps = state => ({
  auth: state.auth,
  profile: state.profile
})

export default connect(
  mapStateToProps
)(SessionButton)
