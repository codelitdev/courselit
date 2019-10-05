import React from 'react'
import PropTypes from 'prop-types'
import { BACKEND } from '../config/constants'
import { formulateMediaUrl } from '../lib/utils'

const Img = (props) => {
  // const image = props.src ? <img
  //   src={`${BACKEND}/media/${props.src}${props.isThumbnail ? '?thumb=1' : ''}`}
  // /> : <img src='/static/default.png'/>
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
