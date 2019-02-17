/**
 * This component displays the title, subtitle and logo
 * of the website.
 */

import React from 'react'
import PropTypes from 'prop-types'

Branding.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string
}

export default function Branding (props) {
  return (
    <div>
      <div>
        <img src='/static/logo.jpg'/>
      </div>
      <div>
        <p>{props.title}</p>
        <p>{props.subtitle}</p>
      </div>
      <style jsx>{`
        img {
          height: 40px;
        }
      `}</style>
    </div>
  )
}
