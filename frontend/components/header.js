/**
 * This component renders the header of the website
 */

import React from 'react'
import PropTypes from 'prop-types'
import Branding from './branding.js'
import SessionButton from './sessionbutton.js'

Header.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  auth: PropTypes.shape({
    guest: PropTypes.bool,
    token: PropTypes.string
  })
}

export default function Header (props) {
  return (
    <div>
      <Branding title={props.title} subtitle={props.subtitle}/>
      <SessionButton auth={props.auth}/>
    </div>
  )
}
