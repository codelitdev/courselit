import React from 'react'
import PropTypes from 'prop-types'
import { BACKEND } from '../config/constants.js'
import { formulateMediaUrl } from '../lib/utils.js'

const Img = (props) => {
  return (
    <>
      <img src={props.src
        ? `${formulateMediaUrl(BACKEND, props.src, props.isThumbnail)}`
        : '/static/default.png'}/>
      <style jsx>{`
        img {
          width: 100%;
          height: auto;
        }
      `}</style>
    </>
  )
}

Img.propTypes = {
  src: PropTypes.string,
  isThumbnail: PropTypes.bool
}

export default Img
