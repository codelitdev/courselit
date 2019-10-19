import React, { useState } from 'react'
import Editor from './Editor.js'
import PropTypes from 'prop-types'
import { BACKEND } from '../../config/constants.js'

import { Grid, IconButton } from '@material-ui/core'
import { AddPhotoAlternate, Code, MusicVideo, FormatQuote } from '@material-ui/icons'
import MediaManager from '../MediaManager.js'
import { makeStyles } from '@material-ui/styles'
import { 
  MEDIA_MANAGER_DIALOG_TITLE,
  ADD_VIDEO_DIALOG_TITLE,
  BTN_ADD_VIDEO
} from '../../config/strings.js'
import AppDialog from '../AppDialog.js'
import { Button } from '@material-ui/core'

const useStyles = makeStyles({
  container: {
    display: 'flex'
  }
})

const stylingForInternalComponentsOfDraftJS = {
  media: {
    container: {
      display: 'flex',
      justifyContent: 'center'
    },
    img: {
      maxWidth: '100%'
    }
  },
  code: {
    background: '#eee'
  },
  blockquote: {
    fontStyle: 'italic',
    marginTop: 10,
    marginBottom: 10,
    borderLeft: '5px solid #cecece',
    paddingLeft: 10,
    fontSize: '1.6em',
    color: '#686868'
  }
}

const EditorUI = (props) => {
  const [addImageDialogOpened, setAddImageDialogOpened] = useState(false)
  const classes = useStyles()

  const onChange = (editorState) => {
    props.onChange(editorState)
  }

  const handleMediaManagerClose = url => {
    setAddImageDialogOpened(false)
    props.onChange(
      Editor.addImage(props.editorState, `${BACKEND}/media/${url}`)
    )
  }

  const highlightCode = () => {
    // props.onChange(
    //   Editor.highlightCode(props.editorState)
    // )
    props.onChange(
      Editor.toggleCode(props.editorState)
    )
  }

  const toggleBlockquote = () => {
    props.onChange(
      Editor.toggleBlockquote(props.editorState)
    )
  }

  return (
    <>
      <Grid container direction='column' className={classes.container}>
        {!props.readOnly &&
          <Grid item>
            <IconButton onClick={() => setAddImageDialogOpened(true)}>
              <AddPhotoAlternate />
            </IconButton>
            <IconButton onClick={highlightCode}>
              <Code />
            </IconButton>
            <IconButton onClick={toggleBlockquote}>
              <FormatQuote />
            </IconButton>
          </Grid>
        }
        <Grid item>
          <Editor
            editorState={props.editorState}
            onChange={onChange}
            readOnly={props.readOnly}
            theme={stylingForInternalComponentsOfDraftJS} />
        </Grid>
      </Grid>
      {/* <MediaManagerDialog
        onOpen={addImageDialogOpened}
        onClose={handleMediaManagerClose}
        title={MEDIA_MANAGER_DIALOG_TITLE}/> */}
      <AppDialog
        onOpen={addImageDialogOpened}
        onClose={handleMediaManagerClose}
        title={MEDIA_MANAGER_DIALOG_TITLE}>
        <MediaManager
          onMediaSelected={handleMediaManagerClose}
          mediaAdditionAllowed={false} />
      </AppDialog>
    </>
  )
}

EditorUI.getDecorators = Editor.getDecorators

EditorUI.propTypes = {
  editorState: PropTypes.object,
  onChange: PropTypes.func,
  readOnly: PropTypes.bool
}

export default EditorUI
