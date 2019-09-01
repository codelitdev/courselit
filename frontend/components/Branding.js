/**
 * This component displays the title, subtitle and logo
 * of the website.
 */

import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import Link from 'next/link'
import Img from './Img'

const Branding = (props) => (
  <div className="branding">
    <Link href='/'>
      <a>
        <Img src={props.logoPath} isThumbnail={true}/>
      </a>
    </Link>
    <div className="text">
      <p>{props.title}</p>
      <p>{props.subtitle}</p>
    </div>
    <style jsx>{`
      .branding {
        display: flex;
        flex: 9;
        flex-direction: row;
      }
      .text {
        display: flex;
        flex-direction: column;
        margin-left: .8em;
      }
      a {
        display: flex;
        width: 56px;
        height: 56px;
      }
      .text p:first-child {
        font-size: 1.6em;
        font-weight: bold;
        font-family: sans-serif;
        flex: 8;
      }
      .text p:last-child {
        font-size: 1.2em;
        color: #696969;
        flex: 2;
      }
    `}</style>
  </div>
)

Branding.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  logoPath: PropTypes.string,
  backend: PropTypes.string
}

const mapStateToProps = state => ({
  title: state.siteinfo.title,
  subtitle: state.siteinfo.subtitle,
  logoPath: state.siteinfo.logopath
})

export default connect(
  mapStateToProps
)(Branding)
