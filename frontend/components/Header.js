/**
 * This component renders the header of the website
 */

import React from 'react'
// import PropTypes from 'prop-types'
import Branding from './Branding.js'
import SessionButton from './SessionButton.js'

export default function Header (props) {
  return (
    <div>
      <Branding />
      <SessionButton />
    </div>
  )
}
