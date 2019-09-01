/**
 * Common layout for all pages
 */
// import { connect } from 'react-redux'
import React from 'react'
import PropTypes from 'prop-types'
import Header from './Header.js'
import { authProps } from '../types.js'

const MasterLayout = (props) => (
  <div className="masterlayout">
    <Header
      className="header"
      title='Rayn Studios'
      subtitle='Learn to code'
      auth={props.auth}/>
    {props.children}
    <style jsx>{`
      .masterlayout {
        display: flex;
        flex-direction: column;
        margin: 1.6em 2em;
      }
    `}</style>
  </div>
)

MasterLayout.propTypes = {
  children: PropTypes.array,
  auth: authProps
}

export default MasterLayout
