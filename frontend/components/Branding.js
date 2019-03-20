/**
 * This component displays the title, subtitle and logo
 * of the website.
 */

import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

const Branding = (props) => (
  <div>
    <div>
      <img src={props.logoPath}/>
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

Branding.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  logoPath: PropTypes.string
}

const mapStateToProps = state => ({
  title: state.brand.title,
  subtitle: state.brand.subtitle,
  logoPath: state.brand.logo
})

export default connect(
  mapStateToProps
)(Branding)
