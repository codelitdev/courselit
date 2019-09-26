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
import { makeStyles } from '@material-ui/styles'
import createImagePlugin from 'draft-js-image-plugin'
import { BACKEND } from '../config/constants.js'
// import createResizeablePlugin from 'draft-js-resizeable-plugin'
// import { composeDecorators } from 'draft-js-plugins-editor'

// const resizeablePlugin = createResizeablePlugin({})
// const decorator = composeDecorators(resizeablePlugin.decorator)
const imagePlugin = createImagePlugin()

const useStyles = makeStyles({
  editor: {
    height: 100,
    maxHeight: 300
  }
})

const stringifyAndEncode = {
  encode: (objectToBeEncoded) => {
    return encode(JSON.stringify(objectToBeEncoded))
  },
  decode: (fromEncodedString) => {
    return JSON.parse(decode(fromEncodedString))
  }
}

const TextEditor = (props) => {
  const initState = props.initialContentState || EditorState.createEmpty()
  const [editorState, setEditorState] = useState(initState)
  const [addImageDialogOpened, setAddImageDialogOpened] = useState(false)
  const classes = useStyles()

  React.useEffect(() => {
    // console.log(initState.getCurrentContent().getPlainText('\u0001'))
    // console.log(editorState.getCurrentContent().getPlainText('\u0001'))
    setEditorState(props.initialContentState)
  }, [props.initialContentState])

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
    props.onChange && props.onChange(editorState)
  }

  const handleMediaManagerClose = path => {
    setAddImageDialogOpened(false)
    setEditorState(
      imagePlugin.addImage(editorState, `${BACKEND}/media/${path}`)
    )
  }

  const addImage = () => {
    setAddImageDialogOpened(true)
  }

  return (
    <div>
      <Grid container direction='column'>
        {!props.readOnly &&
          <Grid item>
            <IconButton onClick={addImage}>
              <AddPhotoAlternate />
            </IconButton>
          </Grid>
        }
        <Grid item className={classes.editor}>
          <RichTextEditor
            editorState={editorState}
            onChange={onChange}
            readOnly={props.readOnly}
            handleKeyCommand={handleKeyCommand}
            plugins={[imagePlugin]}/>
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

TextEditor.emptyState = () => EditorState.createEmpty()

TextEditor.propTypes = {
  initialContentState: PropTypes.any,
  onChange: PropTypes.func,
  readOnly: PropTypes.bool
}

export default TextEditor
