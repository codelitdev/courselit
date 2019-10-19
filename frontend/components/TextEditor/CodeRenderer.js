import React from 'react'
import PropTypes from 'prop-types'

const CodeRenderer = props => {
  console.log(props.entityKey, props.contentState)
  const entity = props.contentState.getEntity(props.entityKey)
  const { text } = entity.getData()
  console.log(text)
  // const text = props.block.getText()
  // console.log(text);
  // const { styles } = props.blockProps

  return (
    <span style={props.styles}>
      {text}
    </span>
  )
}

CodeRenderer.propTypes = {
  contentState: PropTypes.object,
  blockProps: PropTypes.object,
  block: PropTypes.object,
  options: PropTypes.shape({})
}

export default CodeRenderer
