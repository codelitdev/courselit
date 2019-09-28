import React from 'react'
import PropTypes from 'prop-types'
import {
  DRAFTJS_ENTITY_TYPE_IMAGE
} from '../config/constants.js'

const TextEditorMediaRenderer = props => {
  const entity = props.contentState.getEntity(props.block.getEntityAt(0))
  const type = entity.getType()
  const { options } = entity.getData()
  let element
  if (type === DRAFTJS_ENTITY_TYPE_IMAGE) {
    element = <img src={options.href} alt={options.alt}/>
  }
  return element
}

TextEditorMediaRenderer.propTypes = {
  contentState: PropTypes.object,
  block: PropTypes.object,
  options: PropTypes.shape({
    href: PropTypes.string,
    alt: PropTypes.string
  })
}

export default TextEditorMediaRenderer
