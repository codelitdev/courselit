import React from 'react'
import PropTypes from 'prop-types'
import { MEDIA_BACKEND } from '../config/constants.js'
import { formulateMediaUrl } from '../lib/utils.js'

const Img = (props) => {
  return (
    <>
      <img className={props.classes} src={props.src
        ? `${formulateMediaUrl(MEDIA_BACKEND, props.src, props.isThumbnail)}`
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
  src: PropTypes.string.isRequired,
  isThumbnail: PropTypes.bool,
  classes: PropTypes.string
}

export default Img
