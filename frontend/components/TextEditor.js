import React, { useState } from 'react'
import {
  Editor,
  EditorState,
  RichUtils,
  convertFromRaw,
  convertToRaw,
  AtomicBlockUtils
} from 'draft-js'
import 'draft-js/dist/Draft.css'
import TextEditorMediaRenderer from './TextEditorMediaRenderer.js'
import PropTypes from 'prop-types'
import { encode, decode } from 'base-64'
import { Grid, IconButton } from '@material-ui/core'
import AddPhotoAlternate from '@material-ui/icons/AddPhotoAlternate'
import MediaManagerDialog from './MediaManagerDialog.js'
import { makeStyles } from '@material-ui/styles'
import { BACKEND, DRAFTJS_ENTITY_TYPE_IMAGE } from '../config/constants.js'

const useStyles = makeStyles({
  editor: {
    height: 100,
    maxHeight: 300
  }
})

const stringifyAndEncode = {
  encode: (objectToBeEncoded) => encode(JSON.stringify(objectToBeEncoded)),
  decode: (fromEncodedString) => JSON.parse(decode(fromEncodedString))
}

const TextEditor = (props) => {
  const initState = props.initialContentState || EditorState.createEmpty()
  const [editorState, setEditorState] = useState(initState)
  const [addImageDialogOpened, setAddImageDialogOpened] = useState(false)
  const classes = useStyles()

  React.useEffect(() => {
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
    loadImage(path)
  }

  // const addImage = () => {
  //   setAddImageDialogOpened(true)
  // }

  const loadImage = url => {
    const contentState = editorState.getCurrentContent()
    const contentStateWithEntity = contentState.createEntity(
      DRAFTJS_ENTITY_TYPE_IMAGE,
      'IMMUTABLE',
      { options: { href: `${BACKEND}/media/${url}` } }
    )
    const entityKey = contentStateWithEntity.getLastCreatedEntityKey()
    const newEditorState = EditorState.set(editorState, {
      currentContent: contentStateWithEntity
    })
    setEditorState(
      AtomicBlockUtils.insertAtomicBlock(newEditorState, entityKey, ' ')
    )
  }

  const customBlockRenderer = block => {
    if (block.getType() === 'atomic') {
      return {
        component: TextEditorMediaRenderer,
        editable: false
      }
    }
  }

  return (
    <div>
      <Grid container direction='column'>
        {!props.readOnly &&
          <Grid item>
            <IconButton onClick={() => setAddImageDialogOpened(true)}>
              <AddPhotoAlternate />
            </IconButton>
          </Grid>
        }
        <Grid item className={classes.editor}>
          <Editor
            editorState={editorState}
            onChange={onChange}
            readOnly={props.readOnly}
            handleKeyCommand={handleKeyCommand}
            blockRendererFn={customBlockRenderer} />
        </Grid>
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
