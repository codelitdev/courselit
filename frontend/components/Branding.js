/**
 * This component displays the title, subtitle and logo
 * of the website.
 */

import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import Link from 'next/link'

const Branding = (props) => (
  <div>
    <div>
      <Link href='/'>
        <a>
          <img src={props.logoPath}/>
        </a>
      </Link>
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
  title: state.siteinfo.title,
  subtitle: state.siteinfo.subtitle,
  logoPath: state.siteinfo.logopath
})

export default connect(
  mapStateToProps
)(Branding)
