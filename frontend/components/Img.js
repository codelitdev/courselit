import React from 'react'
import PropTypes from 'prop-types'
import { BACKEND } from '../config/constants'

const Img = (props) =>
  props.src ? <img
    src={`${BACKEND}/media/${props.src}${props.isThumbnail ? '?thumb=1' : ''}`}
  /> : <></>

Img.propTypes = {
  src: PropTypes.string,
  isThumbnail: PropTypes.bool
}

export default Img
