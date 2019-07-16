import React, { useState } from 'react'
import { Editor, EditorState, RichUtils } from 'draft-js'
import 'draft-js/dist/Draft.css'
// import { edit } from 'external-editor';

const TextEditor = () => {
  const [editorState, setEditorState] = useState(EditorState.createEmpty())

  const handleKeyCommand = (command, editorState) => {
    const newState = RichUtils.handleKeyCommand(editorState, command)
    if (newState) {
      onChange(newState)
      return 'handled'
    }
    return 'not handled'
  }

  const onChange = (editorState) => setEditorState(editorState)

  return (
    <div>
      <Editor
        className="editor"
        editorState={editorState}
        onChange={onChange}
        handleKeyCommand={handleKeyCommand}/>
      <style jsx>{`
        .editor {
          height: 100px;
          width: 200px;
          border: 1px solid #eee;
        }
      `}</style>
    </div>
  )
}

export default TextEditor
