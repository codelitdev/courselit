import React from 'react'
import Editor from 'draft-js-plugins-editor'
import 'draft-js-image-plugin/lib/plugin.css'

import createImagePlugin from 'draft-js-image-plugin'

const imagePlugin = createImagePlugin()

const RichTextEditor = ({ editorState, onChange, readOnly, handleKeyCommand }) => (
  <Editor
    editorState={editorState}
    onChange={onChange}
    readOnly={readOnly}
    handleKeyCommand={handleKeyCommand}
    editorKey="editor"
    plugins={[imagePlugin]} />
)

export default RichTextEditor
