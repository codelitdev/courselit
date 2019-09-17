import React, { useState } from 'react'
import {
  Editor,
  EditorState,
  RichUtils,
  convertFromRaw,
  convertToRaw
} from 'draft-js'
import 'draft-js/dist/Draft.css'
import PropTypes from 'prop-types'
import { encode, decode } from 'base-64'
import RichTextEditor from './RichTextEditor.js'
import { Grid, IconButton } from '@material-ui/core'
import AddPhotoAlternate from '@material-ui/icons/AddPhotoAlternate'
import MediaManagerDialog from './MediaManagerDialog.js'

const stringifyAndEncode = {
  encode: (objectToBeEncoded) => {
    return encode(JSON.stringify(objectToBeEncoded))
  },
  decode: (fromEncodedString) => {
    return JSON.parse(decode(fromEncodedString))
  }
}

const TextEditor = (props) => {
  const initialEditorState = props.initialContentState
    ? props.initialContentState : EditorState.createEmpty()
  const [editorState, setEditorState] = useState(initialEditorState)
  const [addImageDialogOpened, setAddImageDialogOpened] = useState(false)

  const handleKeyCommand = (command, editorState) => {
    const newState = RichUtils.handleKeyCommand(editorState, command)
    if (newState) {
      onChange(newState)
      return 'handled'
    }
    return 'not handled'
  }

  const onChange = (editorState) => {
    setEditorState(editorState)
    props.onChange(editorState)
  }

  const handleMediaManagerClose = () => {
    setAddImageDialogOpened(false)
  }

  const addImage = () => {
    setAddImageDialogOpened(true)
  }

  return (
    <div>
      <Grid container>
        <Grid item>
          <IconButton onClick={addImage}>
            <AddPhotoAlternate />
          </IconButton>
        </Grid>
        <Grid item>
          <RichTextEditor
            editorState={editorState}
            onChange={onChange}
            readOnly={props.readOnly}
            handleKeyCommand={handleKeyCommand}/>
        </Grid>
        {/* <Editor
          className="editor"
          editorState={editorState}
          onChange={onChange}
          readOnly={props.readOnly}
          handleKeyCommand={handleKeyCommand}
          editorKey="editor"/> */}
      </Grid>
      <MediaManagerDialog
        open={addImageDialogOpened}
        onClose={handleMediaManagerClose}/>
    </div>
  )
}

TextEditor.hydrate = (encodedEditorStateString) =>
  EditorState.createWithContent(
    convertFromRaw(stringifyAndEncode.decode(encodedEditorStateString))
  )

TextEditor.stringify = (editorState) =>
  stringifyAndEncode
    .encode(convertToRaw(editorState.getCurrentContent()))

TextEditor.propTypes = {
  initialContentState: PropTypes.any,
  onChange: PropTypes.func,
  readOnly: PropTypes.bool
}

export default TextEditor
