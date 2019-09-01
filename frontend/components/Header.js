/**
 * This component renders the header of the website
 */

import React from 'react'
import PropTypes from 'prop-types'
import Branding from './Branding.js'
import SessionButton from './SessionButton.js'

export default function Header (props) {
  return (
    <div className="header">
      <Branding backend={props.backend}/>
      <SessionButton />
      <style jsx>{`
        .header {
          display: flex;
        }
      `}</style>
    </div>
  )
}

Header.propTypes = {
  backend: PropTypes.string
}
