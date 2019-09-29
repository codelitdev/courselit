import React from 'react'
import {
  Editor as DraftJSEditor,
  EditorState,
  RichUtils,
  AtomicBlockUtils
} from 'draft-js'
import 'draft-js/dist/Draft.css'
import MediaRenderer from './MediaRenderer.js'
import PropTypes from 'prop-types'

const Editor = (props) => {
  const handleKeyCommand = (command, editorState) => {
    const newState = RichUtils.handleKeyCommand(editorState, command)
    if (newState) {
      props.onChange(newState)
      return 'handled'
    }
    return 'not handled'
  }

  const customBlockRenderer = block => {
    if (block.getType() === 'atomic') {
      return {
        component: MediaRenderer,
        editable: false,
        props: {
          styles: props.theme.media
        }
      }
    }
  }

  // const customBlockStyle = block => {
  //   const type = block.getType()
  //   if (type === 'atomic') {
  //     return 'media'
  //   }
  // }

  return (
    <DraftJSEditor
      editorState={props.editorState}
      onChange={props.onChange}
      readOnly={props.readOnly}
      handleKeyCommand={handleKeyCommand}
      blockRendererFn={customBlockRenderer} />
  )
}

Editor.addImage = (editorState, url) => {
  const contentState = editorState.getCurrentContent()
  const contentStateWithEntity = contentState.createEntity(
    MediaRenderer.IMAGE_TYPE,
    'IMMUTABLE',
    { options: { url } }
  )
  const entityKey = contentStateWithEntity.getLastCreatedEntityKey()
  const newEditorState = EditorState.set(editorState, {
    currentContent: contentStateWithEntity
  })
  return AtomicBlockUtils.insertAtomicBlock(newEditorState, entityKey, ' ')
}

Editor.propTypes = {
  editorState: PropTypes.object,
  onChange: PropTypes.func,
  readOnly: PropTypes.bool,
  theme: PropTypes.object
}

export default Editor
